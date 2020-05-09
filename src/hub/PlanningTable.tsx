import * as React from "react";
import {
  IStatusProps,
  Status,
  Statuses,
  StatusSize,
} from "azure-devops-ui/Status";
import {
  Table,
  ITableColumn,
  TableColumnLayout,
  renderSimpleCell,
  renderSimpleCellValue,
  ColumnFill,
  ISimpleTableCell,
} from "azure-devops-ui/Table";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import {
  TeamSettingsIteration,
  TeamMemberCapacityIdentityRef,
  TeamSetting,
} from "azure-devops-extension-api/Work";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { ISimpleListCell } from "azure-devops-ui/List";
import { css } from "azure-devops-ui/Util";
import { Card } from "azure-devops-ui/Card";
import { TeamMember } from "azure-devops-extension-api/WebApi/WebApi";
import Dictionary from "./Dictionary";
import { WebApiTeam } from "azure-devops-extension-api/Core";
import { WorkItem } from "azure-devops-extension-api/WorkItemTracking";

export interface IPlanningTableProps {
  team?: WebApiTeam;
  iterations: TeamSettingsIteration[];
  teamMembers: TeamMember[];
  iterationCapacities: Dictionary<TeamMemberCapacityIdentityRef[]>;
  iterationWorkItems: Dictionary<WorkItem[]>
  baseUrl?: string;
  teamSettings?: TeamSetting;
}

export interface ITableItem {
  person: TeamMember;
  //   capacities: Dictionary<TeamMemberCapacityIdentityRef>;
  //   iterationEffort: number;
  //   iterationCapacity: number;
}

export const renderStatus = (className?: string) => {
  return (
    <Status
      {...Statuses.Success}
      ariaLabel="Success"
      className={css(className, "bolt-table-status-icon")}
      size={StatusSize.s}
    />
  );
};

export const rawTableItems: ITableItem[] = [
  //   {
  //     age: 50,
  //     gender: "M",
  //     name: { iconProps: { render: renderStatus }, text: "Rory Boisvert" },
  //   },
  //   {
  //     age: 49,
  //     gender: "F",
  //     name: {
  //       iconProps: { iconName: "Home", ariaLabel: "Home" },
  //       text: "Sharon Monroe",
  //     },
  //   },
  //   {
  //     age: 18,
  //     gender: "F",
  //     name: {
  //       iconProps: { iconName: "Home", ariaLabel: "Home" },
  //       text: "Lucy Booth",
  //     },
  //   },
];

export const tableItems = new ArrayItemProvider<ITableItem>(rawTableItems);

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
    return renderSimpleCellValue<any>(
      columnIndex,
      tableColumn,
      tableItem.person.identity.displayName
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
      //`r:${rowIndex}cid:${tableColumn.id}`
    );
  };

  private renderIterationHeaderCell = (
    columnIndex: number,
    tableColumn: ITableColumn<ITableItem>,
    focuszoneId: string | undefined
  ): JSX.Element => {
    const iterationPath = this.props.iterations[columnIndex - 1].path.replace(/\\/g, "\/");
    const teamName = (this.props.team as WebApiTeam).name;
    const sprintUrl = `${this.props.baseUrl}_sprints\/taskboard\/${teamName}\/${iterationPath}`;

    return (

      <td
        className="bolt-table-header-cell col-header-1"
        data-column-index={columnIndex}
        role="columnheader"
        key={columnIndex}
      >
        <div
          className="bolt-table-header-cell-content flex-row"
          data-focuszone="false"
          tabIndex={-1}
        >
          <div className="bolt-table-header-cell-text text-ellipsis">
            <a
              href={ sprintUrl }
              target="_blank"
            >
              {tableColumn.name}
            </a>
          </div>
        </div>
      </td>
    );
  };

  private getTeamMemberCapacity = (
    teamMemberId: string,
    iterationId: string
  ): string => {
    const capacity = this.props.iterationCapacities[iterationId].find(
      (t) => t.teamMember.id == teamMemberId
    );
    if (capacity) return capacity.activities[0].capacityPerDay.toString();
    else return "";
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

  private getIterationEffort = () => {

  }
}
