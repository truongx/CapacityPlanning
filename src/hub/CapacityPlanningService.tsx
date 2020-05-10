import * as SDK from "azure-devops-extension-sdk";
import * as API from "azure-devops-extension-api/Common";
import {
  CoreRestClient,
  WebApiTeam,
  TeamContext,
  ProjectInfo,
} from "azure-devops-extension-api/Core";
import {
  WorkRestClient,
  TeamSettingsIteration,
  TeamMemberCapacity,
  TeamMemberCapacityIdentityRef,
  TeamSetting,
  TeamSettingsDaysOff,
} from "azure-devops-extension-api/Work";
import {
  WorkItemTrackingRestClient,
  WorkItem,
} from "azure-devops-extension-api/WorkItemTracking";
import {
  CommonServiceIds,
  IProjectPageService,
  ILocationService,
  IProjectInfo,
} from "azure-devops-extension-api/Common";
import DateUtil from "./DateUtil";

export interface ITeamMemberIterationCapacity {
  teamMemberId: string;
  capacity?: number;
}

export abstract class CapacityPlanningService {
  private static coreRestClient?: CoreRestClient;
  private static workRestClient?: WorkRestClient;
  private static projectService?: IProjectPageService;
  private static locationService?: ILocationService;

  public static project?: IProjectInfo;
  public static baseUrl: string = "";

  public static async init() {
    SDK.init();
    await SDK.ready();
    this.coreRestClient = await API.getClient(CoreRestClient);
    this.workRestClient = await API.getClient(WorkRestClient);
    this.projectService = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService
    );
    this.locationService = await SDK.getService<ILocationService>(
      CommonServiceIds.LocationService
    );
    const serviceUrl = await this.locationService.getResourceAreaLocation(
      "79134c72-4a58-4b42-976c-04e7115f32bf"
    );

    this.project = await this.getProject();
    this.baseUrl = `${serviceUrl}${(this.project as ProjectInfo).name}\/`;
  }

  public static async getAllTeams() {
    return await this.coreRestClient?.getAllTeams();
  }

  public static async getTeamSettings(teamContext: TeamContext) {
    return await this.workRestClient?.getTeamSettings(teamContext);
  }

  public static async getTeamMembers(projectId: string, teamId: string) {
    const teamMembers = await this.coreRestClient?.getTeamMembersWithExtendedProperties(
      projectId,
      teamId
    );

    if (teamMembers) {
      console.log("Team Members:");
      console.log(teamMembers);

      const filteredTeamMembers = teamMembers.filter((member) => {
        return !member.identity.isContainer;
      });
      console.log("Filtered Team Members:");
      console.log(filteredTeamMembers);

      return filteredTeamMembers;
    }

    return [];
  }

  public static async getIterations(
    teamContext: TeamContext,
    startDate: Date,
    endDate: Date
  ) {
    const teamIterations = await this.workRestClient?.getTeamIterations(
      teamContext
    );
    if (teamIterations) {
      const iterations = teamIterations.filter((iter) => {
        return (
          iter.attributes.startDate >= startDate &&
          iter.attributes.startDate <= endDate
          // &&
          // iter.attributes.finishDate <= endDate
        );
      });

      console.log("Team Iterations:");
      console.log(teamIterations);
      console.log("Filtered Iterations:");
      console.log(iterations);

      return iterations;
    }

    return [];
  }

  public static async getCapacities(
    teamContext: TeamContext,
    iterationId: string
  ) {
    const capacities = await this.workRestClient?.getCapacitiesWithIdentityRef(
      teamContext,
      iterationId
    );

    console.log("Iteration capacities:");
    console.log(capacities);

    return capacities;
  }

  public static async getIterationWorkItems(
    teamContext: TeamContext,
    iterationId: string
  ) {
    const iterationWorkItems = await this.workRestClient?.getIterationWorkItems(
      teamContext,
      iterationId
    );
    if (iterationWorkItems) {
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
      }
    }

    return [];
  }

  public static async getTeamDaysOff(
    teamContext: TeamContext,
    iterationId: string
  ) {
    const teamDaysOff = await this.workRestClient?.getTeamDaysOff(
      teamContext,
      iterationId
    );

    console.log("Team days off:");
    console.log(teamDaysOff);

    return teamDaysOff;
  }

  public static getTeamMemberTotalIterationCapacity(
    teamSettings: TeamSetting,
    capacities: TeamMemberCapacityIdentityRef,
    iteration: TeamSettingsIteration,
    iterationDaysOff: TeamSettingsDaysOff
  ) {
    // const capacities = this.props.iterationCapacities[iterationId].find(
    //   (t) => t.teamMember.id == teamMemberId
    // );
    const workDays = this.getTeamMemberWorkDays(
      teamSettings,
      capacities,
      iteration,
      iterationDaysOff
    );
    console.log("Work Days:");
    console.log(workDays);
    if (capacities && capacities.activities.length > 0) {
      const sum = capacities.activities
        .map((activity) => {
          return activity.capacityPerDay;
        })
        .reduce((prev, curr) => {
          return prev + curr;
        }, 0);

      return (workDays * sum);
    }
  }

  public static getTeamMemberWorkDays = (
    teamSettings: TeamSetting,
    capacities: TeamMemberCapacityIdentityRef,
    iteration: TeamSettingsIteration,
    iterationDaysOff: TeamSettingsDaysOff
  ) => {
    // const capacities = this.props.iterationCapacities[iterationId].find(
    //   (t) => t.teamMember.id == teamMemberId
    // );
    // const iteration = this.props.iterations.find(
    //   (iter) => iter.id == iterationId
    // );
    const workingDays = teamSettings.workingDays;
    if (iteration && capacities) {
      const workDaysNo = DateUtil.getPersonWorkingDays(
        teamSettings.workingDays,
        iteration.attributes.startDate,
        iteration.attributes.finishDate,
        capacities.daysOff,
        iterationDaysOff.daysOff
      );
      return workDaysNo;
    }
    return 0;
  };

  private static async getProject() {
    return await this.projectService?.getProject();
  }
}
