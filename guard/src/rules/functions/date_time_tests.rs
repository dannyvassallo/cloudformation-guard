use std::{
    convert::TryFrom,
    rc::Rc,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::rules::{
    eval_context::eval_context_tests::BasicQueryTesting,
    exprs::AccessQuery,
    functions::date_time::{now, parse_epoch},
    path_value::PathAwareValue,
    EvalContext, QueryResult,
};

#[test]
fn test_parse_epoch() -> crate::rules::Result<()> {
    let value_str = r#"
{
    "Resources": {
        "LambdaFunction": {
            "Type": "AWS::Lambda::Function",
            "Properties": {
                "LastModified": "2023-04-21T13:45:32Z",
                "CreationTime": "2022-01-01T00:00:00Z",
                "BadValue": "not-a-date"
            }
        }
    }
}
    "#;

    let value = PathAwareValue::try_from(serde_yaml::from_str::<serde_yaml::Value>(value_str)?)?;

    let mut eval = BasicQueryTesting {
        root: Rc::new(value),
        recorder: None,
    };

    let last_modified_query = AccessQuery::try_from(
        r#"Resources[ Type == 'AWS::Lambda::Function' ].Properties.LastModified"#,
    )?;

    let results = eval.query(&last_modified_query.query)?;
    match results[0].clone() {
        QueryResult::Literal(val) | QueryResult::Resolved(val) => {
            assert!(matches!(&*val, PathAwareValue::String(_)));
        }
        _ => unreachable!(),
    }

    let epoch_values = parse_epoch(&results)?;
    assert!(matches!(
        epoch_values[0].as_ref().unwrap(),
        PathAwareValue::Int((_, 1682084732))
    ));

    let creation_time_query = AccessQuery::try_from(
        r#"Resources[ Type == 'AWS::Lambda::Function' ].Properties.CreationTime"#,
    )?;
    let results = eval.query(&creation_time_query.query)?;
    match results[0].clone() {
        QueryResult::Literal(val) | QueryResult::Resolved(val) => {
            assert!(matches!(&*val, PathAwareValue::String(_)));
        }
        _ => unreachable!(),
    }

    let epoch_values = parse_epoch(&results)?;
    assert!(matches!(
        epoch_values[0].as_ref().unwrap(),
        PathAwareValue::Int((_, 1640995200))
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

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    assert!((now as i64 - timestamp).abs() <= 1);
}
