use crate::rules::errors::Error;
use crate::rules::{
    path_value::{Path, PathAwareValue},
    QueryResult,
};
use chrono::{DateTime, Utc};
use std::convert::TryFrom;

#[derive(Debug)]
pub enum DurationType {
    Seconds(i64),
    Minutes(i64),
    Hours(i64),
    Days(i64),
    Weeks(i64),
}

impl TryFrom<(&str, i64)> for DurationType {
    type Error = Error;

    fn try_from(value: (&str, i64)) -> Result<Self, Self::Error> {
        let (duration_str, units) = value;
        match duration_str.to_lowercase().as_str() {
            "seconds" => Ok(DurationType::Seconds(units)),
            "minutes" => Ok(DurationType::Minutes(units)),
            "hours" => Ok(DurationType::Hours(units)),
            "days" => Ok(DurationType::Days(units)),
            "weeks" => Ok(DurationType::Weeks(units)),
            _ => Err(Error::ParseError(duration_str.to_string())),
        }
    }
}

pub(crate) fn parse_epoch(
    args: &[QueryResult],
) -> crate::rules::Result<Vec<Option<PathAwareValue>>> {
    let mut aggr = vec![];
    for entry in args.iter() {
        match entry {
            QueryResult::Literal(val) | QueryResult::Resolved(val) => match &**val {
                PathAwareValue::String((path, val)) => {
                    let datetime = DateTime::parse_from_rfc3339(val)
                        .map_err(|e| {
                            crate::Error::ParseError(format!(
                                "failed to parse datetime: {val} at {path}: {e}"
                            ))
                        })?
                        .with_timezone(&Utc);
                    let epoch = datetime.timestamp();
                    aggr.push(Some(PathAwareValue::Int((path.clone(), epoch))));
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

pub(crate) fn add_duration_to_epoch(
    epoch: i64,
    duration_str: &str,
    units: i64,
) -> crate::rules::Result<i64> {
    let duration = DurationType::try_from((duration_str, units));
    let new_epoch = match duration {
        Ok(DurationType::Seconds(s)) => epoch + s,
        Ok(DurationType::Minutes(m)) => epoch + m * 60,
        Ok(DurationType::Hours(h)) => epoch + h * 3600,
        Ok(DurationType::Days(d)) => epoch + d * 86400,
        Ok(DurationType::Weeks(w)) => epoch + w * 604800,
        Err(err) => return Err(err),
    };
    Ok(new_epoch)
}

pub(crate) fn subtract_duration_from_epoch(
    epoch: i64,
    duration_str: &str,
    units: i64,
) -> crate::rules::Result<i64> {
    let duration = DurationType::try_from((duration_str, units));
    let new_epoch = match duration {
        Ok(DurationType::Seconds(s)) => epoch - s,
        Ok(DurationType::Minutes(m)) => epoch - m * 60,
        Ok(DurationType::Hours(h)) => epoch - h * 3600,
        Ok(DurationType::Days(d)) => epoch - d * 86400,
        Ok(DurationType::Weeks(w)) => epoch - w * 604800,
        _ => unreachable!(),
    };
    Ok(new_epoch)
}

pub(crate) fn epoch_difference(start_epoch: i64, end_epoch: i64) -> crate::rules::Result<i64> {
    let result = end_epoch - start_epoch;
    Ok(result)
}

pub(crate) fn is_epoch_in_future(
    epoch: i64,
    duration_str: &str,
    units: i64,
) -> crate::rules::Result<bool> {
    let duration = DurationType::try_from((duration_str, units));
    let now = Utc::now().timestamp();
    let future_epoch = match duration {
        Ok(DurationType::Seconds(s)) => now + s,
        Ok(DurationType::Minutes(m)) => now + m * 60,
        Ok(DurationType::Hours(h)) => now + h * 3600,
        Ok(DurationType::Days(d)) => now + d * 86400,
        Ok(DurationType::Weeks(w)) => now + w * 604800,
        _ => unreachable!(),
    };
    Ok(epoch > future_epoch)
}

pub(crate) fn is_epoch_in_past(
    epoch: i64,
    duration_str: &str,
    units: i64,
) -> crate::rules::Result<bool> {
    let duration = DurationType::try_from((duration_str, units));
    let now = Utc::now().timestamp();
    let past_epoch = match duration {
        Ok(DurationType::Seconds(s)) => now - s,
        Ok(DurationType::Minutes(m)) => now - m * 60,
        Ok(DurationType::Hours(h)) => now - h * 3600,
        Ok(DurationType::Days(d)) => now - d * 86400,
        Ok(DurationType::Weeks(w)) => now - w * 604800,
        _ => unreachable!(),
    };
    Ok(epoch < past_epoch)
}

pub(crate) fn now() -> crate::rules::Result<Vec<Option<PathAwareValue>>> {
    let now = Utc::now().timestamp();
    let path_aware_value = PathAwareValue::Int((Path::root(), now));
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
