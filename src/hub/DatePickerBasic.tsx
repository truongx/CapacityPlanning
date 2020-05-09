import * as React from "react";
import {
  DatePicker,
  DayOfWeek,
  IDatePickerStrings,
  mergeStyleSets,
  IDatePickerProps,
} from "office-ui-fabric-react";

const DayPickerStrings: IDatePickerStrings = {
  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],

  shortMonths: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],

  days: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],

  shortDays: ["S", "M", "T", "W", "T", "F", "S"],

  goToToday: "Go to today",
  prevMonthAriaLabel: "Go to previous month",
  nextMonthAriaLabel: "Go to next month",
  prevYearAriaLabel: "Go to previous year",
  nextYearAriaLabel: "Go to next year",
  closeButtonAriaLabel: "Close date picker",
};

const controlClass = mergeStyleSets({
  control: {
    margin: "1px 5px 0px 5px",
    maxWidth: "300px",
  },
});

const firstDayOfWeek = DayOfWeek.Monday;

const onFormatDate = (date?: Date): string => {
  if(date){
    return (
      date.getDate() +
      "/" +
      (date.getMonth() + 1) +
      "/" +
      (date.getFullYear())
    );
  }
  else return "";
};

export default class DatePickerBasic extends React.Component<
  IDatePickerProps,
  {}
> {
  public render(): JSX.Element {
    return (
      <div>
        <DatePicker
          id={this.props.id}
          className={controlClass.control}
          firstDayOfWeek={firstDayOfWeek}
          strings={DayPickerStrings}
          placeholder={this.props.placeholder}
          ariaLabel={this.props.ariaLabel}
          label={this.props.label}
          disabled={this.props.disabled}
          onSelectDate={this.props.onSelectDate}
          value={this.props.value}
          formatDate={onFormatDate}
        />
      </div>
    );
  }
}
