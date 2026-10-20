# Human evaluation plan — not yet executed

Release decision, 20 October 2026: the project owner chose to skip friend/user recruitment. This protocol is retained for possible future use; it contains no participant results. A separate owner confirmation that A/B playback works is not counted as a usability or preference study.

The ready-to-run Indonesian moderator guide, participant task cards, per-session notes and evaluation template are in [the user-testing kit](user-testing/README.md). No participant responses have been collected by preparing this kit. The history and owner-confirmed closure of the A/B playback report are tracked in [the listening diagnosis](audio/listening-check/README.md).

## Formative usability pilot

Recruit 5–8 target users with different familiarity with headphone measurements. Record consent and anonymous participant IDs; do not collect names in the project repository. Use the same browser tasks: find a familiar model, interpret its similarity score, choose the requested form in the quiz, compare two candidates, interpret the map, and return to earlier results.

Record task completion, time, assistance, errors, interpretation of the score, and verbatim comments with permission. A 0–100 similarity score must not be interpreted as a probability of liking the product. Report participant-level observations and changes made, including failures. This small convenience sample is for discovering usability problems, not estimating population accuracy.

Suggested CSV columns: `participant_id,task_id,completed_without_help,time_seconds,assistance,interpretation_error,comment,follow_up_change`. Leave the dataset empty until real sessions occur. Synthetic responses must never be mixed into participant data.

## Separate relevance/preference study

Before claiming auditory relevance, define which claim is being tested: resemblance to a reference, personal preference, or usability. Listening comparisons need controlled level, equipment, fitting, presentation order and actual access to the products or a separately validated simulation. The current browser EQ illustration is not a validated replacement for physical listening.

Select candidate pairs before collecting responses; include the deployed method, a simpler baseline, near ties and difficult cases. Hide method identity, randomize order and log missing judgments. Determine sample size and analysis for the actual recruitment design before claiming a comparative effect; the usability pilot is not an accuracy benchmark.

If collected labels are used to fit weights, group all known variants and verified aliases before development/test splits. Preserve an untouched evaluation set and prerecord metric definitions. Report disagreement and uncertainty. Do not train and evaluate on formula-generated labels, or treat multiple measurements of one model as independent listeners.
