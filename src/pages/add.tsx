import { Typography } from "@material-ui/core";
import React from "react";
import {
  FormattedMessage,
  useIntl,
  defineMessages,
  FormattedNumber,
} from "react-intl";
import { Formik, Field, Form } from "formik";
import { TextField } from "formik-material-ui";
import {
  TextField as Text,
  FormControl,
  InputAdornment,
  ButtonGroup,
  Button,
} from "@material-ui/core";
import { object, string, number, date } from "yup";
import { DateTimePicker } from "formik-material-ui-pickers";
import { createFilterOptions } from "@material-ui/lab/Autocomplete";
import { Autocomplete } from "formik-material-ui-lab";
import withEnsuredSession from "../hocs/withEnsuredSession";
import { isBefore } from "date-fns";
import { maxLimitDate, minLimitDate } from "../lib/rules";
import { useDateFormat } from "../translations/DateFormatterProvider";
import { useBrands } from "../db/useBrands";
import { toTitleCase } from "../db/toTitleCase";
import useOfflineSession from "../db/useOfflineSession";
import usePutDrink from "../db/usePutDrink";

type Option = {
  id: number;
  name?: string;
};

const filter = createFilterOptions();

const messages = defineMessages({
  string: {
    defaultMessage: "Måste vara en textsträng",
  },
  number: {
    defaultMessage: "Måste vara en siffra",
  },
  date: {
    defaultMessage: "Måste vara ett giltigt datum",
  },
  required: {
    defaultMessage: "Obligatoriskt fält",
  },
  "max.string": {
    defaultMessage: "Maxlängd är {max}",
    values: { max: 32 },
  },
  "min.number": {
    defaultMessage: "Lägsta tillåtna värde är {min}",
    values: { min: 0 },
  },
  "max.number": {
    defaultMessage: "Högsta tillåtna värde är {max}",
    values: { max: 2 },
  },
  "min.date": {
    defaultMessage: "Lägsta tillåtna datum är {date}",
  },
  "max.date": {
    defaultMessage: "Högsta tillåtna datum är {date}",
  },
  "future.date": {
    defaultMessage: "Du får ej ange en tid i framtiden",
  },
  "user.new": {
    defaultMessage: "Du måste vara inloggad",
  },
  "user.old": {
    defaultMessage: "Du får inte byta användare",
  },
  unknownError: {
    defaultMessage: "Något är fel med fältet",
  },
});

const parse = (data: string, dateFormat, intl): string => {
  if (
    /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test(
      data
    )
  ) {
    return dateFormat(new Date(data));
  } else if (/^\d{1,2}$/.test(data)) {
    return intl.formatNumber(parseInt(data, 10));
  }
  return data;
};

const getErrorMessage = (id, rawValues, dateFormat, intl) => {
  const message = messages[id] ?? messages.unknownError;
  let values = {};
  if (rawValues) {
    values = rawValues
      .split(",")
      .map((r) => r.split("!"))
      .reduce((a, [key, val]) => {
        a[key] = parse(val, dateFormat, intl);
        return a;
      }, {});
  }
  console.log([message, values, rawValues]);
  return [message, values];
};

const Add = () => {
  const intl = useIntl();
  const format = useDateFormat();

  const brands = useBrands();
  const [saveDrink] = usePutDrink();

  const schema = object({
    brand: string(intl.formatMessage(messages.string))
      .required(intl.formatMessage(messages.required))
      .max(32, intl.formatMessage(messages["max.string"], { max: 32 })),
    amount: number()
      .required(intl.formatMessage(messages.required))
      .min(0, intl.formatMessage(messages["min.number"], { min: 0 }))
      .max(2, intl.formatMessage(messages["max.number"], { max: 2 })),
    time: date(intl.formatMessage(messages.date))
      .required(intl.formatMessage(messages.required))
      .min(
        minLimitDate,
        intl.formatMessage(messages["min.date"], {
          date: format(minLimitDate, "Pp"),
        })
      )
      .max(
        maxLimitDate,
        intl.formatMessage(messages["max.date"], {
          date: format(maxLimitDate, "Pp"),
        })
      )
      .test({
        name: "isPast",
        test: (value: Date): boolean => isBefore(value, new Date()),
        message: intl.formatMessage(messages["future.date"]),
      }),
  });

  return (
    <>
      <Typography variant="h1">
        <FormattedMessage defaultMessage="Lägg till dryck" />
      </Typography>
      <Formik
        initialValues={{
          brand: undefined,
          amount: "",
          time: new Date(),
        }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting, setFieldError }) => {
          try {
            await saveDrink(values);
          } catch (error) {
            if (error.status === 403) {
              const [field, errorCode, values] = error.message.split("/");
              setFieldError(
                field,
                intl.formatMessage.apply(
                  null,
                  getErrorMessage(errorCode, values, format, intl)
                )
              );
              return;
            }
            console.error(error);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, errors, touched, setFieldValue }) => (
          <Form noValidate>
            <FormControl fullWidth margin="normal">
              <Field
                name="brand"
                component={Autocomplete}
                options={brands}
                filterOptions={(options, params) => {
                  const filtered = filter(options, params);
                  if (params.inputValue !== "") {
                    filtered.push(toTitleCase(params.inputValue));
                  }
                  return filtered;
                }}
                getOptionLabel={(option?: string | Option) => {
                  if (typeof option === "string") {
                    return toTitleCase(option);
                  }
                  return toTitleCase(option?.name || "");
                }}
                renderInput={(params) => {
                  return (
                    <Text
                      {...params}
                      {...params.inputProps}
                      label={<FormattedMessage defaultMessage="Märke" />}
                      error={touched["brand"] && !!errors["brand"]}
                      helperText={touched["brand"] && errors["brand"]}
                    />
                  );
                }}
              />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <Field
                component={TextField}
                name="amount"
                type="number"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <FormattedMessage defaultMessage="L" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  min: 0,
                  max: 2,
                  step: 0.01,
                }}
                label={<FormattedMessage defaultMessage="Mängd" />}
                placeholder="0.33"
              />
            </FormControl>
            <ButtonGroup variant="text" size="small" color="secondary">
              {[0.25, 0.33, 0.5, 1, 1.4, 1.5].map((amount) => (
                <Button
                  key={amount}
                  onClick={() => setFieldValue("amount", amount)}
                >
                  <FormattedMessage
                    defaultMessage="{amount} L"
                    values={{ amount: <FormattedNumber value={amount} /> }}
                  />
                </Button>
              ))}
            </ButtonGroup>
            <FormControl fullWidth margin="normal">
              <Field
                ampm={false}
                component={DateTimePicker}
                disableFuture={true}
                minDate={minLimitDate}
                maxDate={maxLimitDate}
                format="Pp"
                name="time"
                label={<FormattedMessage defaultMessage="Tidpunkt" />}
                invalidDateMessage={intl.formatMessage({
                  defaultMessage: "Ogiltigt datum",
                })}
                invalidLabel={intl.formatMessage({
                  defaultMessage: "Ogiltigt datum",
                })}
                maxDateMessage={intl.formatMessage(messages["max.date"], {
                  date: format(maxLimitDate),
                })}
                minDateMessage={intl.formatMessage(messages["min.date"], {
                  date: format(minLimitDate),
                })}
                cancelLabel={<FormattedMessage defaultMessage="Avbryt" />}
                okLabel={<FormattedMessage defaultMessage="OK" />}
                clearLabel={<FormattedMessage defaultMessage="Rensa" />}
                todayLabel={<FormattedMessage defaultMessage="Nu" />}
                showTodayButton
              />
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
            >
              <FormattedMessage defaultMessage="Spara" />
            </Button>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default withEnsuredSession()(Add);
