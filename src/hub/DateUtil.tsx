import { DateRange } from "azure-devops-extension-api/Work";
import { DayOfWeek } from "azure-devops-extension-api/Common/System";

export default abstract class DateUtil {
  public static getPersonWorkingDays(
    workingDays: DayOfWeek[],
    iterationStart: Date,
    iterationEnd: Date,
    personalDaysOff: DateRange[],
    teamDaysOff: DateRange[]
  ) {
    console.log("Working Days:");
    console.log(workingDays);
    console.log("Personal Days Off:");
    console.log(personalDaysOff);
    console.log("Team Days Off:");
    console.log(teamDaysOff);

    let personWorkingDays = 0;
    let currentStep = iterationStart;

    while (currentStep <= iterationEnd) {
      console.log("Step: " + currentStep.toUTCString());

      if (workingDays.indexOf(currentStep.getUTCDay()) >= 0) {
        console.log("WORKING DAY");

        if (
          !this.isDateWithinRanges(currentStep, [
            ...personalDaysOff,
            ...teamDaysOff,
          ])
        ) {
          personWorkingDays++;
        } else console.log("DAY OFF");
      }
      currentStep = this.addDays(currentStep, 1);
    }

    return personWorkingDays;
  }

  private static isDateWithinRanges(date: Date, ranges: DateRange[]) {
    for (let i = 0; i < ranges.length; i++) {
      if (this.isDateWithinRange(date, ranges[i])) return true;
    }
    return false;
  }

  private static isDateWithinRange(date: Date, range: DateRange) {
    const dateUTC = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
    const startUTC = new Date(
      range.start.getUTCFullYear(),
      range.start.getUTCMonth(),
      range.start.getUTCDate()
    );
    const endUTC = new Date(
      range.end.getUTCFullYear(),
      range.end.getUTCMonth(),
      range.end.getUTCDate()
    );

    console.log("dateUTC: " + dateUTC.toString());
    console.log("startUTC: " + startUTC.toString());
    console.log("endUTC: " + endUTC.toString());

    return dateUTC >= startUTC && dateUTC <= endUTC;
  }

  private static addDays(date: Date, days: number) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
