use std::{convert::TryFrom, rc::Rc};

use crate::rules::{
    eval_context::eval_context_tests::BasicQueryTesting,
    exprs::AccessQuery,
    functions::date_time::{epoch_offset, now, parse_epoch},
    path_value::PathAwareValue,
    EvalContext, QueryResult,
};
use chrono::{Datelike, Utc};
use pretty_assertions::assert_eq;

const VALUE_STR: &str = r#"
{
    "Resources": {
        "LambdaFunction": {
            "Type": "AWS::Lambda::Function",
            "Properties": {
                "UpdatedAt": "2024-08-21T00:00:00Z",
                "CreatedAt": "2024-08-13T00:00:00Z",
                "BadValue": "not-a-date"
            }
        }
    }
}
    "#;

#[test]
fn test_parse_epoch() -> crate::rules::Result<()> {
    let value = PathAwareValue::try_from(serde_yaml::from_str::<serde_yaml::Value>(VALUE_STR)?)?;

    let mut eval = BasicQueryTesting {
        root: Rc::new(value),
        recorder: None,
    };

    let updated_at_query = AccessQuery::try_from(
        r#"Resources[ Type == 'AWS::Lambda::Function' ].Properties.UpdatedAt"#,
    )?;

    let results = eval.query(&updated_at_query.query)?;
    match results[0].clone() {
        QueryResult::Literal(val) | QueryResult::Resolved(val) => {
            assert!(matches!(&*val, PathAwareValue::String(_)));
        }
        _ => unreachable!(),
    }

    let epoch_values = parse_epoch(&results)?;
    assert!(matches!(
        epoch_values[0].as_ref().unwrap(),
        PathAwareValue::Int((_, 1724198400))
    ));

    let created_at_query = AccessQuery::try_from(
        r#"Resources[ Type == 'AWS::Lambda::Function' ].Properties.CreatedAt"#,
    )?;
    let results = eval.query(&created_at_query.query)?;
    match results[0].clone() {
        QueryResult::Literal(val) | QueryResult::Resolved(val) => {
            assert!(matches!(&*val, PathAwareValue::String(_)));
        }
        _ => unreachable!(),
    }

    let epoch_values = parse_epoch(&results)?;
    assert!(matches!(
        epoch_values[0].as_ref().unwrap(),
        PathAwareValue::Int((_, 1723507200))
    ));

    let bad_query = AccessQuery::try_from(
        r#"Resources[ Type == 'AWS::Lambda::Function' ].Properties.BadValue"#,
    )?;

    let results = eval.query(&bad_query.query)?;
    match results[0].clone() {
        QueryResult::Literal(val) | QueryResult::Resolved(val) => {
            assert!(matches!(&*val, PathAwareValue::String(_)));
        }
        _ => unreachable!(),
    }

    assert!(parse_epoch(&results).is_err());

    Ok(())
}

#[test]
fn test_now() {
    let now_result = now();
    assert!(now_result.is_ok());

    let now_vec = now_result.unwrap();
    assert_eq!(now_vec.len(), 1);

    let now_option = now_vec.first().unwrap();
    assert!(now_option.is_some());

    let now_value = now_option.as_ref().unwrap();
    assert!(matches!(now_value, PathAwareValue::Int((_, _))));

    let timestamp = match now_value {
        PathAwareValue::Int((_, timestamp)) => *timestamp,
        _ => unreachable!(),
    };

    let now = Utc::now().timestamp();

    assert!((now - timestamp).abs() <= 1);
}

#[test]
fn test_epoch_offset() -> crate::rules::Result<()> {
    let value = PathAwareValue::try_from(serde_yaml::from_str::<serde_yaml::Value>(VALUE_STR)?)?;

    let mut eval = BasicQueryTesting {
        root: Rc::new(value),
        recorder: None,
    };

    let created_at_query = AccessQuery::try_from(
        r#"Resources[ Type == 'AWS::Lambda::Function' ].Properties.CreatedAt"#,
    )?;
    let results = eval.query(&created_at_query.query)?;

    let epoch_values = parse_epoch(&results)?;
    let created_at_epoch = match epoch_values[0].as_ref().unwrap() {
        PathAwareValue::Int((_, epoch)) => *epoch,
        _ => unreachable!(),
    };

    let offset_values = epoch_offset(10, "days", "from", Some(created_at_epoch))?;
    assert!(matches!(
        offset_values[0].as_ref().unwrap(),
        PathAwareValue::Int((_, result_epoch))
        if *result_epoch == created_at_epoch + 864000 // 10 days * 86400 seconds/day
    ));

    let offset_values = epoch_offset(1, "hours", "ago", None)?;
    let current_time = Utc::now().timestamp();
    assert!(matches!(
        offset_values[0].as_ref().unwrap(),
        PathAwareValue::Int((_, result_epoch))
        if (current_time - *result_epoch).abs() <= 3600 // within an hour
    ));

    let offset_values = epoch_offset(3, "months", "from_now", None)?;
    let current_time = Utc::now().naive_utc();
    let current_year = current_time.year();
    let current_month = current_time.month();

    let expected_time = if current_month + 3 > 12 {
        current_time
            .with_year(current_year + 1)
            .and_then(|d| d.with_month((current_month + 3) % 12))
            .unwrap()
    } else {
        current_time.with_month(current_month + 3).unwrap()
    };

    assert!(matches!(
        offset_values[0].as_ref().unwrap(),
        PathAwareValue::Int((_, result_epoch))
        if *result_epoch == expected_time.timestamp()
    ));

    let result = epoch_offset(10, "days", "invalid_direction", Some(created_at_epoch));
    assert!(result.is_err());

    let result = epoch_offset(10, "invalid_unit", "from_now", None);
    assert!(result.is_err());

    let invalid_time_query = AccessQuery::try_from(
        r#"Resources[ Type == 'AWS::Lambda::Function' ].Properties.BadValue"#,
    )?;
    let results = eval.query(&invalid_time_query.query)?;
    assert!(parse_epoch(&results).is_err());

    Ok(())
}
