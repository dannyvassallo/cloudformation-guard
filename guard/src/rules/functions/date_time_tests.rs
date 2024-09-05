use std::{convert::TryFrom, rc::Rc};

use crate::rules::{
    eval_context::eval_context_tests::BasicQueryTesting,
    exprs::AccessQuery,
    functions::date_time::{epoch_from_seconds, now, parse_epoch},
    path_value::{Path, PathAwareValue},
    EvalContext, QueryResult,
};
use chrono::Utc;
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
fn test_epoch_from_seconds() -> crate::rules::Result<()> {
    let valid_seconds = 1723507200;
    let epoch_from_seconds_result = epoch_from_seconds(valid_seconds);
    assert!(epoch_from_seconds_result.is_ok());

    let epoch_from_seconds_vec = epoch_from_seconds_result.unwrap();
    assert_eq!(epoch_from_seconds_vec.len(), 1);

    let epoch_from_seconds_option = epoch_from_seconds_vec.first().unwrap();
    assert!(epoch_from_seconds_option.is_some());

    let epoch_from_seconds_value = epoch_from_seconds_option.as_ref().unwrap();
    assert!(matches!(
        epoch_from_seconds_value,
        PathAwareValue::Int((path, value)) if path == &Path::try_from("epoch_from_seconds").unwrap() && *value == valid_seconds
    ));

    let negative_seconds = -1723507200;
    let epoch_from_seconds_result = epoch_from_seconds(negative_seconds);
    assert!(epoch_from_seconds_result.is_ok());

    let epoch_from_seconds_vec = epoch_from_seconds_result.unwrap();
    assert_eq!(epoch_from_seconds_vec.len(), 1);

    let epoch_from_seconds_option = epoch_from_seconds_vec.first().unwrap();
    assert!(epoch_from_seconds_option.is_some());

    let epoch_from_seconds_value = epoch_from_seconds_option.as_ref().unwrap();
    assert!(matches!(
        epoch_from_seconds_value,
        PathAwareValue::Int((path, value)) if path == &Path::try_from("epoch_from_seconds").unwrap() && *value == negative_seconds
    ));

    Ok(())
}
