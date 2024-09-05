use crate::rules::{
    path_value::{Path, PathAwareValue},
    QueryResult,
};
use chrono::prelude::*;
use chrono::Utc;
use std::convert::TryFrom;

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

pub(crate) fn now() -> crate::rules::Result<Vec<Option<PathAwareValue>>> {
    let now = Utc::now().timestamp();
    let path = Path::try_from("now")?;
    let path_aware_value = PathAwareValue::Int((path, now));
    Ok(vec![Some(path_aware_value)])
}

pub(crate) fn epoch_from_seconds(
    seconds: i64,
) -> crate::rules::Result<Vec<Option<PathAwareValue>>> {
    let new_path = Path::try_from("epoch_from_seconds")?;
    let naive_datetime = NaiveDateTime::from_timestamp_opt(seconds, 0).ok_or_else(|| {
        crate::Error::ParseError(format!(
            "Failed to create NaiveDateTime from seconds: {seconds}"
        ))
    })?;
    let datetime: DateTime<Utc> = DateTime::from_utc(naive_datetime, Utc);
    let epoch = datetime.timestamp();
    let path_aware_value = PathAwareValue::Int((new_path, epoch));
    Ok(vec![Some(path_aware_value)])
}

#[cfg(test)]
#[path = "date_time_tests.rs"]
mod date_time_tests;
