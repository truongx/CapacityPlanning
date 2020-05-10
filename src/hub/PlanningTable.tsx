import * as React from "react";
import {
  Table,
  ITableColumn,
  renderSimpleCellValue,
  ColumnFill,
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
import { ITeamMemberIterationCapacity } from "./CapacityPlanningService";

export interface IPlanningTableProps {
  team?: WebApiTeam;
  iterations: TeamSettingsIteration[];
  teamMembers: TeamMember[];
  teamMemberIterationCapacities: Dictionary<ITeamMemberIterationCapacity[]>;
  iterationCapacities: Dictionary<TeamMemberCapacityIdentityRef[]>;
  iterationWorkItems: Dictionary<WorkItem[]>;
  iterationDaysOff: Dictionary<TeamSettingsDaysOff>;
  baseUrl?: string;
  teamSettings?: TeamSetting;
}

export interface ITableItem {
  person: TeamMember;
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
    const teamMemberCapacity = this.props.teamMemberIterationCapacities[
      tableColumn.id
    ].find((t) => {
      return t.teamMemberId == tableItem.person.identity.id;
    });
    let totalCapacity = "-";
    if (teamMemberCapacity && teamMemberCapacity.capacity) {
      totalCapacity = teamMemberCapacity.capacity.toString();
    }
    return renderSimpleCellValue<any>(columnIndex, tableColumn, totalCapacity);
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
    const iterationTotalCapacity = this.props.teamMemberIterationCapacities[
      tableColumn.id
    ]
      .map((val) => {
        if (val.capacity) return val.capacity;
        else return 0;
      })
      .reduce((previousValue, currentValue) => {
        return previousValue + currentValue;
      }, 0);
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
            Capacity: {iterationTotalCapacity}
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
}
