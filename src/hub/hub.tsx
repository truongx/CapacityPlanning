import "./hub.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "azure-devops-extension-sdk";
import * as API from "azure-devops-extension-api/Common";
import {
  CoreRestClient,
  WebApiTeam,
  TeamContext,
  ProjectInfo,
} from "azure-devops-extension-api/Core";
import { Dropdown, DropdownExpandableButton } from "azure-devops-ui/Dropdown";
import { IListBoxItem, ListBoxItemType } from "azure-devops-ui/ListBox";
import {
  WorkRestClient,
  TeamSettingsIteration,
  TeamMemberCapacity,
  TeamMemberCapacityIdentityRef,
  TeamSetting,
} from "azure-devops-extension-api/Work";
import {
  WorkItemTrackingRestClient,
  WorkItem,
} from "azure-devops-extension-api/WorkItemTracking";
import {
  CommonServiceIds,
  IProjectPageService,
  IProjectInfo,
  IHostNavigationService,
  ILocationService,
} from "azure-devops-extension-api";
import { Button } from "azure-devops-ui/Button";
import { Header } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import DatePickerBasic from "./DatePickerBasic";
import { initializeIcons } from "office-ui-fabric-react/lib/Icons";
import { Card } from "azure-devops-ui/Card";
import { TeamMember } from "azure-devops-extension-api/WebApi/WebApi";
import PlanningTable from "./PlanningTable";
import Dictionary from "./Dictionary";
import { css } from "azure-devops-ui/Util";

interface IHubState {
  project?: IProjectInfo;
  teams: WebApiTeam[];
  team?: WebApiTeam;
  teamMembers: TeamMember[];
  teamSettings?: TeamSetting;
  iterations: TeamSettingsIteration[];
  iterationCapacities: Dictionary<TeamMemberCapacityIdentityRef[]>;
  iterationWorkItems: Dictionary<WorkItem[]>;
  startDate?: Date;
  endDate?: Date;
  loading: boolean;
  baseUrl?: string;
}

class Hub extends React.Component<{}, IHubState> {
  private debug = true;

  constructor(props: {}) {
    super(props);
    this.state = {
      teams: [],
      teamMembers: [],
      iterationCapacities: {},
      iterationWorkItems: {},
      iterations: [],
      loading: false,
    };
  }

  public componentDidMount() {
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    SDK.init();
    await SDK.ready();
    // const accessToken = await SDK.getAccessToken();
    // const appToken = await SDK.getAppToken();
    // console.log("access token: " + accessToken);
    // console.log("app token: " + appToken);
    const projectService = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService
    );
    const locationService = await SDK.getService<ILocationService>(
      CommonServiceIds.LocationService
    );
    const serviceUrl = await locationService.getResourceAreaLocation(
      "79134c72-4a58-4b42-976c-04e7115f32bf"
    );
    const project = await projectService.getProject();
    const teams = await API.getClient(CoreRestClient).getAllTeams();
    const baseUrl = `${serviceUrl}${(project as ProjectInfo).name}\/`;
    console.log(baseUrl);
    this.setState({ teams, project, baseUrl });
  }

  private getTeamMembers = async (projectId: string, teamId: string) => {
    const teamMembers = await API.getClient(
      CoreRestClient
    ).getTeamMembersWithExtendedProperties(projectId, teamId);
    console.log("Team Members:");
    console.log(teamMembers);
    const filteredTeamMembers = teamMembers.filter((member) => {
      return !member.identity.isContainer;
    });
    console.log("Filtered Team Members:");
    console.log(filteredTeamMembers);
    return filteredTeamMembers;
  };

  private getTeamSettings = async (teamContext: TeamContext) => {
    return await API.getClient(WorkRestClient).getTeamSettings(teamContext);
  };

  private getCapacities = async (
    teamContext: TeamContext,
    iterationId: string
  ) => {
    const capacities = await API.getClient(
      WorkRestClient
    ).getCapacitiesWithIdentityRef(teamContext, iterationId);
    console.log("Iteration capacities:");
    console.log(capacities);
    return capacities;
  };

  private getIterations = async (teamContext: TeamContext) => {
    const teamIterations = await API.getClient(
      WorkRestClient
    ).getTeamIterations(teamContext);
    const iterations = teamIterations.filter((iter) => {
      const startDate = this.state.startDate as Date;
      const endDate = this.state.endDate as Date;

      return (
        iter.attributes.startDate >= startDate &&
        iter.attributes.finishDate <= endDate
      );
    });
    console.log("Team Iterations:");
    console.log(teamIterations);
    console.log("Filtered Iterations:");
    console.log(iterations);
    return iterations;
  };

  private getIterationWorkItems = async (
    teamContext: TeamContext,
    iterationId: string
  ) => {
    const iterationWorkItems = await API.getClient(
      WorkRestClient
    ).getIterationWorkItems(teamContext, iterationId);

    console.log("Iteration work item links:");
    console.log(iterationWorkItems);

    const workItemIds = iterationWorkItems.workItemRelations
      .filter((wil) => {
        return wil.rel === null;
      })
      .map((wil) => {
        return wil.target.id;
      });

    console.log("Iteration work item Ids:");
    console.log(workItemIds);

    if (workItemIds.length > 0) {
      const workItems = await API.getClient(
        WorkItemTrackingRestClient
      ).getWorkItems(workItemIds, teamContext.project);

      console.log("Iteration work items:");
      console.log(workItems);

      return workItems;
    } else return [];
  };

  public render(): JSX.Element {
    const teams = this.state.teams.map(
      (val) =>
        ({
          id: val.id,
          text: val.name,
        } as IListBoxItem)
    );

    return (
      <Page className="flex-grow">
        <Header title="Capacity Planning" />
        <div className="page-content page-content-top">
          <Card className="flex-grow">
            <Dropdown
              placeholder="Select Team"
              items={teams}
              renderExpandable={(props) => (
                <DropdownExpandableButton {...props} />
              )}
              onSelect={this.onSelectTeam}
            />
            <DatePickerBasic
              id="start-date-picker"
              placeholder="Start date"
              disabled={this.state.team === undefined}
              onSelectDate={this.onSelectStartDate}
              value={this.state.startDate}
            />
            <DatePickerBasic
              id="end-date-picker"
              placeholder="End date"
              disabled={this.state.team === undefined}
              onSelectDate={this.onSelectEndDate}
              value={this.state.endDate}
            />
            <Button
              text="Load"
              disabled={
                this.state.loading ||
                this.state.startDate === undefined ||
                this.state.endDate === undefined ||
                !this.isDateRangeValid()
              }
              onClick={this.loadData}
            />
          </Card>
          {this.state.loading && this.debug && (
            <div
              className="flex flex-grow flex-center full-size justify-center"
              style={{ height: "60vh" }}
            >
              <div className="bolt-spinner flex-column text-center rhythm-vertical-8">
                <div className="bolt-spinner-circle large" />
                <div className="bolt-spinner-label">Loading...</div>
              </div>
            </div>
          )}
          {!this.isThereAnyData() && !this.state.loading && (
            <div>NO DATA TO SHOW</div>
          )}
          {this.isThereAnyData() && !this.state.loading && (
            <PlanningTable
              iterations={this.state.iterations}
              teamMembers={this.state.teamMembers}
              iterationCapacities={this.state.iterationCapacities}
              iterationWorkItems={this.state.iterationWorkItems}
              baseUrl={this.state.baseUrl}
              team={this.state.team}
              teamSettings={this.state.teamSettings}
            />
          )}
          {this.state.team && this.debug && (
            <div>
              Selected team: {this.state.team.id} : {this.state.team.name}
            </div>
          )}
          {this.state.iterations.length > 0 &&
            !this.state.loading &&
            this.debug && (
              <div>
                <h1>Iterations</h1>
                <ul>
                  {this.state.iterations.map((iteration, index) => (
                    <li key={index}>
                      <a href={iteration.url} target="_blank">
                        {iteration.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {this.state.teamMembers.length > 0 &&
            !this.state.loading &&
            this.debug && (
              <div>
                <h1>Team Members</h1>
                <ul>
                  {this.state.teamMembers.map((member, index) => (
                    <li key={index}>{member.identity.displayName}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </Page>
    );
  }

  private isThereAnyData = () => {
    return (
      this.state.teamMembers.length > 0 && this.state.iterations.length > 0
    );
  };

  private isDateRangeValid = () => {
    if (this.state.startDate && this.state.endDate) {
      console.log(this.state.startDate < this.state.endDate);
      return this.state.startDate < this.state.endDate;
    } else return false;
  };

  private onSelectStartDate = (date: Date | null | undefined) => {
    if (date) {
      const startDate = date;
      this.setState({ startDate });
    }
  };

  private onSelectEndDate = (date: Date | null | undefined) => {
    if (date) {
      const endDate = date;
      this.setState({ endDate });
    }
  };

  private onSelectTeam = (
    event: React.SyntheticEvent<HTMLElement>,
    item: IListBoxItem<{}>
  ) => {
    const selectedTeam = this.state.teams.find((t) => t.id == item.id);
    this.setState({ team: selectedTeam }, () => {});
  };

  private loadData = async () => {
    const projectId = this.state.project ? this.state.project.id : "";
    const teamId = this.state.team ? this.state.team.id : "";
    const teamContext = {
      projectId: projectId,
      teamId: teamId,
    } as TeamContext;
    this.setState({ loading: true });
    const iterations = await this.getIterations(teamContext);
    const teamMembers = await this.getTeamMembers(projectId, teamId);
    const teamSettings = await this.getTeamSettings(teamContext);
    let iterationCapacities: Dictionary<TeamMemberCapacityIdentityRef[]> = {};
    let iterationWorkItems: Dictionary<WorkItem[]> = {};
    for (let iter of iterations) {
      console.log("Iteration '" + iter.name);
      const capacities = await this.getCapacities(teamContext, iter.id);
      iterationCapacities[iter.id] = capacities;
      const workItems = await this.getIterationWorkItems(teamContext, iter.id);
      iterationWorkItems[iter.id] = workItems;
    }

    this.setState({
      loading: false,
      iterations,
      teamMembers,
      iterationCapacities,
      teamSettings,
      iterationWorkItems,
    });
  };
}

initializeIcons();
ReactDOM.render(<Hub />, document.getElementById("root"));
