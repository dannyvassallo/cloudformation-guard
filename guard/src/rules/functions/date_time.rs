use crate::rules::errors::Error;
use crate::rules::{
    path_value::{Path, PathAwareValue},
    QueryResult,
};
use chrono::prelude::*;
use chrono::{Duration, NaiveDateTime, Utc};
use std::convert::TryFrom;

#[derive(Debug)]
pub enum DurationUnit {
    Seconds,
    Minutes,
    Hours,
    Days,
    Weeks,
    Months,
    Years,
}

impl TryFrom<&str> for DurationUnit {
    type Error = String;

    fn try_from(value: &str) -> std::result::Result<DurationUnit, std::string::String> {
        match value {
            "seconds" => Ok(DurationUnit::Seconds),
            "minutes" => Ok(DurationUnit::Minutes),
            "hours" => Ok(DurationUnit::Hours),
            "days" => Ok(DurationUnit::Days),
            "weeks" => Ok(DurationUnit::Weeks),
            "months" => Ok(DurationUnit::Months),
            "years" => Ok(DurationUnit::Years),
            _ => Err(format!("Unsupported duration: {}", value,)),
        }
    }
}

#[derive(Debug)]
pub enum Direction {
    FromNow,
    Ago,
    From,
    Before,
}

impl TryFrom<&str> for Direction {
    type Error = String;

    fn try_from(value: &str) -> std::result::Result<Direction, std::string::String> {
        match value {
            "from_now" => Ok(Direction::FromNow),
            "ago" => Ok(Direction::Ago),
            "from" => Ok(Direction::From),
            "before" => Ok(Direction::Before),
            _ => Err(format!("Unsupported direction: {}", value,)),
        }
    }
}

pub(crate) fn parse_epoch(
    args: &[QueryResult],
) -> crate::rules::Result<Vec<Option<PathAwareValue>>> {
    let new_path = Path::try_from("parse_epoch")?;
    let mut aggr = vec![];
    for entry in args.iter() {
        match entry {
            QueryResult::Literal(val) | QueryResult::Resolved(val) => match &**val {
                PathAwareValue::String((path, val)) => {
                    let datetime = DateTime::parse_from_rfc3339(val)
                        .map_err(|e| {
                            crate::Error::ParseError(format!(
                                "Failed to parse datetime: {val} at {path}: {e}"
                            ))
                        })?
                        .with_timezone(&Utc);
                    let epoch = datetime.timestamp();
                    aggr.push(Some(PathAwareValue::Int((new_path.clone(), epoch))));
                }
                _ => {
                    aggr.push(None);
                }
            },
            _ => {
                aggr.push(None);
            }
        }
    }

    Ok(aggr)
}

pub(crate) fn epoch_offset(
    units: i64,
    duration_str: &str,
    direction_str: &str,
    epoch: Option<i64>,
) -> crate::rules::Result<Vec<Option<PathAwareValue>>> {
    let path = Path::try_from("epoch_offset")?;
    let duration_unit = DurationUnit::try_from(duration_str)
        .map_err(|e| crate::Error::ParseError(format!("Failed to create epoch_offset: {e}")))?;
    let direction = Direction::try_from(direction_str)
        .map_err(|e| crate::Error::ParseError(format!("Failed to create epoch_offset: {e}")))?;

    let now = Utc::now().naive_utc();

    let new_date = match duration_unit {
        DurationUnit::Seconds => now + Duration::seconds(units),
        DurationUnit::Minutes => now + Duration::minutes(units),
        DurationUnit::Hours => now + Duration::hours(units),
        DurationUnit::Days => now + Duration::days(units),
        DurationUnit::Weeks => now + Duration::weeks(units),
        DurationUnit::Months => {
            let mut year = now.year();
            let mut month = now.month() as i32 + units as i32;
            if month > 12 {
                year += month / 12;
                month %= 12;
            } else if month < 1 {
                year += (month / 12) - 1;
                month = 12 + month % 12;
            }
            now.with_year(year)
                .and_then(|d| d.with_month(month as u32))
                .ok_or_else(|| {
                    crate::Error::ParseError("Invalid date calculation for months".to_string())
                })?
        }
        DurationUnit::Years => {
            let year = now.year() + units as i32;
            now.with_year(year).ok_or_else(|| {
                crate::Error::ParseError("Invalid date calculation for years".to_string())
            })?
        }
    };

    let final_date = match direction {
        Direction::FromNow => new_date,
        Direction::Ago => now - (new_date - now),
        Direction::From => match epoch {
            Some(from_epoch) => {
                let from_datetime = NaiveDateTime::from_timestamp_opt(from_epoch, 0)
                    .ok_or_else(|| crate::Error::ParseError("Invalid epoch".to_string()))?;
                from_datetime + (new_date - now)
            }
            None => {
                return Err(crate::Error::ParseError(
                    "Missing epoch when direction is 'from'".to_string(),
                ))
            }
        },
        Direction::Before => match epoch {
            Some(before_epoch) => {
                let from_datetime = NaiveDateTime::from_timestamp_opt(before_epoch, 0)
                    .ok_or_else(|| crate::Error::ParseError("Invalid epoch".to_string()))?;
                from_datetime - (new_date - now)
            }
            None => {
                return Err(crate::Error::ParseError(
                    "Missing epoch when direction is 'before'".to_string(),
                ))
            }
        },
    };

    Ok(vec![Some(PathAwareValue::Int((
        path,
        final_date.timestamp(),
    )))])
}

pub(crate) fn now() -> crate::rules::Result<Vec<Option<PathAwareValue>>> {
    let now = Utc::now().timestamp();
    let path = Path::try_from("now")?;
    let path_aware_value = PathAwareValue::Int((path, now));
    Ok(vec![Some(path_aware_value)])
}

pub(crate) fn extract_int_from_arg(
    arg: &[QueryResult],
    error_msg: &str,
) -> crate::rules::Result<i64> {
    match &arg[0] {
        QueryResult::Literal(r) | QueryResult::Resolved(r) => match &**r {
            PathAwareValue::Int((_, n)) => Ok(*n),
            _ => Err(Error::ParseError(error_msg.to_string())),
        },
        _ => Err(Error::ParseError(error_msg.to_string())),
    }
}

pub(crate) fn extract_string_from_arg<'a>(
    arg: &'a [QueryResult],
    error_msg: &str,
) -> crate::rules::Result<&'a str> {
    match &arg[0] {
        QueryResult::Literal(r) | QueryResult::Resolved(r) => match &**r {
            PathAwareValue::String((_, s)) => Ok(s),
            _ => Err(Error::ParseError(error_msg.to_string())),
        },
        _ => Err(Error::ParseError(error_msg.to_string())),
    }
}

#[cfg(test)]
#[path = "date_time_tests.rs"]
mod date_time_tests;
