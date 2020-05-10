import "./hub.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { WebApiTeam, TeamContext } from "azure-devops-extension-api/Core";
import { Dropdown, DropdownExpandableButton } from "azure-devops-ui/Dropdown";
import { IListBoxItem, ListBoxItemType } from "azure-devops-ui/ListBox";
import {
  TeamSettingsIteration,
  TeamMemberCapacityIdentityRef,
  TeamSetting,
  TeamSettingsDaysOff,
} from "azure-devops-extension-api/Work";
import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import { IProjectInfo } from "azure-devops-extension-api";
import { Button } from "azure-devops-ui/Button";
import { Header } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import DatePickerBasic from "./DatePickerBasic";
import { initializeIcons } from "office-ui-fabric-react/lib/Icons";
import { Card } from "azure-devops-ui/Card";
import { TeamMember } from "azure-devops-extension-api/WebApi/WebApi";
import PlanningTable from "./PlanningTable";
import Dictionary from "./Dictionary";
import CapacityPlanningService from "./CapacityPlanningService";

interface IHubState {
  project?: IProjectInfo;
  teams: WebApiTeam[];
  team?: WebApiTeam;
  teamMembers: TeamMember[];
  teamSettings?: TeamSetting;
  iterations: TeamSettingsIteration[];
  iterationCapacities: Dictionary<TeamMemberCapacityIdentityRef[]>;
  iterationWorkItems: Dictionary<WorkItem[]>;
  iterationDaysOff: Dictionary<TeamSettingsDaysOff>;
  startDate?: Date;
  endDate?: Date;
  loading: boolean;
  baseUrl?: string;
}

class Hub extends React.Component<{}, IHubState> {
  private debug = false;

  constructor(props: {}) {
    super(props);
    this.state = {
      teams: [],
      teamMembers: [],
      iterationCapacities: {},
      iterationWorkItems: {},
      iterationDaysOff: {},
      iterations: [],
      loading: false,
    };
  }

  public componentDidMount() {
    this.initializeState();
  }

  private async initializeState(): Promise<void> {
    await CapacityPlanningService.init();
    const project = CapacityPlanningService.project;
    const teams = await CapacityPlanningService.getAllTeams();
    const baseUrl = CapacityPlanningService.baseUrl;
    if (project && teams && baseUrl) {
      this.setState({ teams, project, baseUrl });
    } else {
      console.error("initializeState error");
    }
  }

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
          {this.state.loading && (
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
              iterationDaysOff={this.state.iterationDaysOff}
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
    const iterations = await CapacityPlanningService.getIterations(
      teamContext,
      this.state.startDate as Date,
      this.state.endDate as Date
    );
    const teamMembers = await CapacityPlanningService.getTeamMembers(
      projectId,
      teamId
    );
    const teamSettings = await CapacityPlanningService.getTeamSettings(
      teamContext
    );
    let iterationCapacities: Dictionary<TeamMemberCapacityIdentityRef[]> = {};
    let iterationWorkItems: Dictionary<WorkItem[]> = {};
    let iterationDaysOff: Dictionary<TeamSettingsDaysOff> = {};
    for (let iter of iterations) {
      console.log("Iteration '" + iter.name);
      const capacities = await CapacityPlanningService.getCapacities(
        teamContext,
        iter.id
      );
      if (capacities) iterationCapacities[iter.id] = capacities;
      const workItems = await CapacityPlanningService.getIterationWorkItems(
        teamContext,
        iter.id
      );
      iterationWorkItems[iter.id] = workItems;
      const teamDaysOff = await CapacityPlanningService.getTeamDaysOff(
        teamContext,
        iter.id
      );
      if (teamDaysOff) iterationDaysOff[iter.id] = teamDaysOff;
    }

    this.setState({
      loading: false,
      iterations,
      teamMembers,
      iterationCapacities,
      teamSettings,
      iterationWorkItems,
      iterationDaysOff,
    });
  };
}

initializeIcons();
ReactDOM.render(<Hub />, document.getElementById("root"));
