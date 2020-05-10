import * as React from "react";
import {
  Table,
  ITableColumn,
  TableColumnLayout,
  renderSimpleCell,
  renderSimpleCellValue,
  ColumnFill,
  ISimpleTableCell,
  TwoLineTableCell,
} from "azure-devops-ui/Table";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import {
  TeamSettingsIteration,
  TeamMemberCapacityIdentityRef,
  TeamSetting,
  Activity,
  TeamSettingsDaysOff,
} from "azure-devops-extension-api/Work";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { ISimpleListCell } from "azure-devops-ui/List";
import { css } from "azure-devops-ui/Util";
import { Card } from "azure-devops-ui/Card";
import {
  TeamMember,
  IdentityRef,
} from "azure-devops-extension-api/WebApi/WebApi";
import Dictionary from "./Dictionary";
import { WebApiTeam } from "azure-devops-extension-api/Core";
import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";
import {
  VssPersona,
  IIdentityDetailsProvider,
} from "azure-devops-ui/VssPersona";
import DateUtil from "./DateUtil";

export interface IPlanningTableProps {
  team?: WebApiTeam;
  iterations: TeamSettingsIteration[];
  teamMembers: TeamMember[];
  iterationCapacities: Dictionary<TeamMemberCapacityIdentityRef[]>;
  iterationWorkItems: Dictionary<WorkItem[]>;
  iterationDaysOff: Dictionary<TeamSettingsDaysOff>;
  baseUrl?: string;
  teamSettings?: TeamSetting;
}

export interface IPlanningTableState {
  teamMemberIterationCapacities: Dictionary<ITeamMemberIterationCapacity[]>;
}

export interface ITableItem {
  person: TeamMember;
}

interface ITeamMemberIterationCapacity {
  teamMemberId: string;
  capacity: number;
}

export default class PlanningTable extends React.Component<
  IPlanningTableProps,
  {}
> {
  public render(): JSX.Element {
    return (
      <Card
        className="flex-grow bolt-table-card"
        contentProps={{ contentPadding: false }}
      >
        <Table
          columns={this.getColumns()}
          itemProvider={this.getItems()}
          role="table"
          scrollable
        />
      </Card>
    );
  }

  private renderPersonCell = (
    rowIndex: number,
    columnIndex: number,
    tableColumn: ITableColumn<ITableItem>,
    tableItem: ITableItem
  ): JSX.Element => {
    console.log(tableItem);
    return (
      <td
        aria-colindex={columnIndex + 1}
        className="bolt-table-cell bolt-list-cell"
        data-column-index={columnIndex}
        role="gridcell"
        key={columnIndex}
      >
        <div className="bolt-table-cell-content flex-row flex-center">
          <span className="bolt-list-cell-child flex-row flex-center bolt-list-cell-text">
            <VssPersona
              identityDetailsProvider={this.getIdentityDetails(
                tableItem.person.identity
              )}
              size={"medium"}
              className="icon-margin"
            />
            <span className="text-ellipsis body-m">
              {tableItem.person.identity.displayName}
            </span>
          </span>
        </div>
      </td>
    );
  };

  private renderIterationCell = (
    rowIndex: number,
    columnIndex: number,
    tableColumn: ITableColumn<ITableItem>,
    tableItem: ITableItem
  ): JSX.Element => {
    return renderSimpleCellValue<any>(
      columnIndex,
      tableColumn,
      this.getTeamMemberCapacity(tableItem.person.identity.id, tableColumn.id)
    );
  };

  private renderIterationHeaderCell = (
    columnIndex: number,
    tableColumn: ITableColumn<ITableItem>,
    focuszoneId: string | undefined
  ): JSX.Element => {
    const iterationPath = this.props.iterations[columnIndex - 1].path.replace(
      /\\/g,
      "/"
    );
    const teamName = (this.props.team as WebApiTeam).name;
    const sprintUrl = `${this.props.baseUrl}_sprints\/taskboard\/${teamName}\/${iterationPath}`;
    return (
      <TwoLineTableCell
        className="bolt-table-cell-content-with-inline-link no-v-padding"
        key={"col-" + columnIndex}
        columnIndex={columnIndex}
        tableColumn={tableColumn}
        line1={
          <span className="bolt-table-header-cell-text text-ellipsis">
            <a href={sprintUrl} target="_blank">
              {tableColumn.name}
            </a>
          </span>
        }
        line2={
          <span className="fontSize font-size secondary-text flex-row flex-center text-ellipsis">
            Capacity: {this.getIterationCapacity(tableColumn.id)}
            <br />
            Effort: {this.getIterationEffort(tableColumn.id)}
          </span>
        }
      />
    );
  };

  private getIdentityDetails(
    identity: IdentityRef
  ): IIdentityDetailsProvider | undefined {
    return {
      getDisplayName() {
        return identity.displayName;
      },
      getIdentityImageUrl(size: number) {
        return identity.imageUrl;
      },
    };
  }

  private getTeamMemberCapacity = (
    teamMemberId: string,
    iterationId: string
  ): string => {
    const capacities = this.props.iterationCapacities[iterationId].find(
      (t) => t.teamMember.id == teamMemberId
    );
    const workDays = this.getTeamMemberWorkDays(teamMemberId, iterationId);
    console.log("Work Days:");
    console.log(workDays);
    if (capacities) {
      const sum = capacities.activities
        .map((activity) => {
          return activity.capacityPerDay;
        })
        .reduce((prev, curr) => {
          return prev + curr;
        }, 0);

      return (workDays * sum).toString();
    }

    return "-";
  };

  private getTeamMemberWorkDays = (
    teamMemberId: string,
    iterationId: string
  ) => {
    const capacities = this.props.iterationCapacities[iterationId].find(
      (t) => t.teamMember.id == teamMemberId
    );
    const iteration = this.props.iterations.find(
      (iter) => iter.id == iterationId
    );
    const workingDays = (this.props.teamSettings as TeamSetting).workingDays;
    const teamDaysOff = this.props.iterationDaysOff[iterationId];
    if(iteration && capacities) {
      const workDaysNo = DateUtil.getPersonWorkingDays(workingDays, iteration.attributes.startDate, iteration.attributes.finishDate, capacities.daysOff, teamDaysOff.daysOff);
      return workDaysNo;
    }
    return 0;
  };

  private getColumns = (): ITableColumn<any>[] => {
    let columns = new Array<ITableColumn<any>>();

    columns.push({
      id: "person",
      name: "Person",
      renderCell: this.renderPersonCell,
      width: new ObservableValue(200),
    });
    this.props.iterations.forEach((iteration) => {
      columns.push({
        id: iteration.id,
        name: iteration.name,
        renderCell: this.renderIterationCell,
        renderHeaderCell: this.renderIterationHeaderCell,
        width: new ObservableValue(150),
      });
    });
    columns.push(ColumnFill);

    return columns;
  };

  private getItems = (): ArrayItemProvider<ITableItem> => {
    let items = new Array<ITableItem>();

    this.props.teamMembers.forEach((member) => {
      items.push({
        person: member,
      });
    });

    return new ArrayItemProvider(items);
  };

  private getIterationEffort = (iterationId: string) => {
    //TODO: implement
    return 0;
  };

  private getIterationCapacity = (iterationId: string) => {
    // const iterationCapacities = this.props.iterationCapacities[iterationId];
    // if(iterationCapacities) {
    //   iterationCapacities.reduce<number>(, 0);
    // }
    return 0;
  };
}
