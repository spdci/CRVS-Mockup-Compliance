@data
Feature: CRVS person data rules (CRVSPerson)

The CRVS standard makes almost every person attribute optional. A record may disclose
only an identifier. But whenever an attribute IS sent it must be correct: right type,
right format, a value from the right code list, and consistent with the rest of the record.

This feature is the rule book. It runs offline (no API) and proves that the validator
applied to every record returned by the API scenarios accepts absent attributes, accepts
correct values and rejects incorrect ones.

Sources: crvs_api_v1.0.0.yaml, extensions/crvs/v1/data/CRVSPerson.jsonld,
core/v1/data (Person, Name, Identifier, Address, Place, GeoCoordinates, GeoLocation),
core/v1/code (SexCategoryEnum, MaritalStatusEnum, IdentifierTypeEnum).

  # ---------------------------------------------------------------------------
  # Reference records
  # ---------------------------------------------------------------------------
  @smoke
  Scenario Outline: Reference record "<record>" is valid CRVS person data
    Given the "<record>" CRVS person record
    Then the person record should be valid

    Examples:
      | record       |
      | spec example |
      | full         |
      | minimal      |
      | newborn      |
      | deceased     |
      | stillborn    |
      | married      |
      | divorced     |
      | widow        |
      | multi        |

  Scenario: A record with no attribute at all is accepted (nothing is mandatory)
    Given an empty CRVS person record
    Then the person record should be valid

  # ---------------------------------------------------------------------------
  # Absent optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: Optional attribute "<attribute>" may be omitted
    Given the "full" CRVS person record
    When its "<attribute>" attribute is removed
    Then the person record should be valid

    Examples:
      | attribute                                  |
      | @context                                   |
      | @id                                        |
      | @type                                      |
      | identifier                                 |
      | name                                       |
      | name.second_name                           |
      | name.maiden_name                           |
      | name.prefix                                |
      | name.suffix                                |
      | phone_number                               |
      | email                                      |
      | sex                                        |
      | birth_date                                 |
      | birth_place                                |
      | birth_place.geo                            |
      | birth_place.contained_in_place             |
      | birth_place.contains_place                 |
      | address                                    |
      | address.geo_location                       |
      | address.address_line2                      |
      | address.postal_code                        |
      | address.country_code                       |
      | marital_status                             |
      | parent1_identifier                         |
      | parent2_identifier                         |
      | registration_date                          |
      | last_updated                               |

  # ---------------------------------------------------------------------------
  # Correct values for optional attributes are accepted
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" accepts the correct value <value>
    Given the "full" CRVS person record
    When its "<attribute>" attribute is set to '<value>'
    Then the person record should be valid

    Examples: Identifiers (IdentifierTypeEnum: UIN, BRN, MRN, DRN)
      | attribute                          | value                                                                                                   |
      | identifier                         | [{"identifier_type":"UIN","identifier_value":"123456789"}]                                              |
      | identifier                         | [{"identifier_type":"BRN","identifier_value":"BRN-2020-001"}]                                           |
      | identifier                         | [{"identifier_type":"MRN","identifier_value":"MRN-2020-001"}]                                           |
      | identifier                         | [{"identifier_type":"DRN","identifier_value":"DRN-2020-001"}]                                           |
      | identifier                         | [{"identifier_type":"UIN","identifier_value":"1"},{"identifier_type":"BRN","identifier_value":"2"}]      |
      | parent1_identifier                 | {"identifier_type":"BRN","identifier_value":"BRN-1950-001"}                                             |
      | parent2_identifier                 | {"@id":"Identifier","@type":"Identifier","identifier_type":"UIN","identifier_value":"888"}             |

    Examples: Name
      | attribute | value                                              |
      | name      | {"surname":"Doe"}                                  |
      | name      | {"given_name":"Jane"}                              |
      | name      | {"surname":"Doe Smith","given_name":"Jane Ann"}    |
      | name      | {"given_name":"Jane","prefix":"Ms.","suffix":"Jr"} |

    Examples: Contact details (E.164 phone, RFC 5322 e-mail)
      | attribute    | value                                        |
      | phone_number | ["+14155552671"]                             |
      | phone_number | ["+96170123456","+33612345678"]              |
      | phone_number | []                                           |
      | email        | ["jane.doe@example.org"]                     |
      | email        | ["a@example.com","b.c+tag@sub.example.co"]   |

    Examples: Sex (SexCategoryEnum)
      | attribute | value     |
      | sex       | "male"    |
      | sex       | "female"  |
      | sex       | "other"   |
      | sex       | "unknown" |

    Examples: Marital status (MaritalStatusEnum)
      | attribute      | value |
      | marital_status | "M"   |
      | marital_status | "W"   |
      | marital_status | "A"   |
      | marital_status | "D"   |
      | marital_status | "L"   |
      | marital_status | "U"   |

    Examples: Dates (ISO 8601 DateTime)
      | attribute         | value                           |
      | birth_date        | "1980-03-23"                    |
      | birth_date        | "1980-03-23T10:20:15"           |
      | birth_date        | "1980-03-23T10:20:15Z"          |
      | birth_date        | "1980-03-23T10:20:15.123+05:30" |
      | birth_date        | "1980-03-23T10:20"              |
      | birth_date        | "1980-02-29"                    |
      | death_date        | ""                              |
      | death_date        | "2020-01-01"                    |
      | registration_date | "1980-03-23T12:00:00Z"          |
      | last_updated      | "2025-01-01T00:00:00-04:00"     |

    Examples: Places (Place, GeoCoordinates)
      | attribute                        | value                                                       |
      | birth_place                      | {"name":"City Hospital"}                                    |
      | birth_place                      | {"geo":{"latitude":-33.8688,"longitude":151.2093}}          |
      | birth_place.geo                  | {"latitude":90,"longitude":180}                             |
      | birth_place.geo                  | {"latitude":-90,"longitude":-180}                           |
      | birth_place.contained_in_place   | "Madrid"                                                    |
      | birth_place.contains_place       | []                                                          |
      | death_place                      | ""                                                          |
      | death_place                      | {"name":"Home","address_line":"1 Main St"}                  |

    Examples: Address (CRVS single object or core list form)
      | attribute                                         | value                                                                    |
      | address                                           | {"address_line1":"1 Main St","locality":"Town","country_code":"TH"}      |
      | address                                           | [{"address_line_1":"1 Main St","country_code":"THA"}]                    |
      | address                                           | [{"locality":"A"},{"locality":"B"}]                                       |
      | address.country_code                              | "FR"                                                                     |
      | address.geo_location.plus_code.global_code        | "8FVC9G8F+6X"                                                            |
      | address.geo_location.plus_code.geometry.location  | {"latitude":0,"longitude":0}                                              |

  # ---------------------------------------------------------------------------
  # Incorrect values for optional attributes are rejected
  # ---------------------------------------------------------------------------
  Scenario Outline: "<attribute>" rejects the incorrect value <value>
    Given the "full" CRVS person record
    When its "<attribute>" attribute is set to '<value>'
    Then the person record should be rejected because of "<error>"

    Examples: Identifiers
      | attribute                             | value                                                      | error                          |
      | identifier                            | {"identifier_type":"UIN","identifier_value":"1"}           | /identifier must be array      |
      | identifier                            | []                                                         | /identifier must NOT have fewer than 1 items |
      | identifier.0.identifier_type          | "PASSPORT"                                                 | /identifier/0/identifier_type must be equal to one of the allowed values |
      | identifier.0.identifier_type          | "uin"                                                      | /identifier/0/identifier_type  |
      | identifier.0.identifier_value         | ""                                                         | /identifier/0/identifier_value |
      | identifier.0.identifier_value         | 123456789                                                  | /identifier/0/identifier_value must be string |
      | identifier                            | [{"identifier_type":"UIN"}]                                | must have required property 'identifier_value' |
      | identifier                            | [{"identifier_value":"1"}]                                 | must have required property 'identifier_type'  |
      | identifier                            | [{"identifier_type":"UIN","identifier_value":"1"},{"identifier_type":"UIN","identifier_value":"1"}] | identifier contains duplicates |
      | parent1_identifier                    | {"identifier_type":"XYZ","identifier_value":"1"}           | /parent1_identifier/identifier_type |
      | parent1_identifier                    | "537564821"                                                | /parent1_identifier must be object  |
      | parent1_identifier                    | {"identifier_type":"UIN","identifier_value":"700000007"}   | parent1_identifier is the person's own identifier |
      | parent2_identifier                    | {"identifier_type":"UIN","identifier_value":"537564821"}   | parent1_identifier and parent2_identifier are the same |

    Examples: Name
      | attribute       | value                    | error                                      |
      | name            | "Elena Martinez"         | /name must be object                       |
      | name            | {}                       | /name must have required property 'surname' |
      | name            | {"prefix":"Dr."}         | /name must have required property          |
      | name.given_name | 42                       | /name/given_name must be string            |
      | name.surname    | ["Martinez"]             | /name/surname must be string               |

    Examples: Contact details
      | attribute      | value                    | error                         |
      | phone_number   | "+34612345678"           | /phone_number must be array   |
      | phone_number   | ["0612345678"]           | /phone_number/0 must match pattern |
      | phone_number   | ["+34 612 345 678"]      | /phone_number/0 must match pattern |
      | phone_number   | ["+0612345678"]          | /phone_number/0 must match pattern |
      | phone_number   | ["+1234567890123456"]    | /phone_number/0 must match pattern |
      | email          | "elena@example.com"      | /email must be array          |
      | email          | ["not-an-email"]         | /email/0 must match format "email" |
      | email          | ["elena@"]               | /email/0 must match format "email" |

    Examples: Sex
      | attribute | value     | error                                       |
      | sex       | "F"       | /sex must be equal to one of the allowed values |
      | sex       | "Female"  | /sex must be equal to one of the allowed values |
      | sex       | "1"       | /sex must be equal to one of the allowed values |
      | sex       | 2         | /sex must be string                          |
      | sex       | ""        | /sex must be equal to one of the allowed values |

    Examples: Marital status
      | attribute      | value       | error                                                  |
      | marital_status | "married"   | /marital_status must be equal to one of the allowed values |
      | marital_status | "X"         | /marital_status must be equal to one of the allowed values |
      | marital_status | "m"         | /marital_status must be equal to one of the allowed values |

    Examples: Dates
      | attribute         | value                    | error                                         |
      | birth_date        | "23/03/1980"             | /birth_date must match pattern                |
      | birth_date        | "1980-3-23"              | /birth_date must match pattern                |
      | birth_date        | "19800323"               | /birth_date must match pattern                |
      | birth_date        | "1980-13-01"             | /birth_date must match pattern                |
      | birth_date        | "1980-02-30"             | birth_date "1980-02-30" is not a valid ISO 8601 calendar date |
      | birth_date        | "2023-02-29"             | birth_date "2023-02-29" is not a valid ISO 8601 calendar date |
      | birth_date        | "1980-03-23T25:00:00"    | /birth_date must match pattern                |
      | birth_date        | ""                       | /birth_date must match pattern                |
      | birth_date        | 322617600                | /birth_date must be string                    |
      | birth_date        | "2999-01-01"             | birth_date "2999-01-01" is in the future      |
      | death_date        | "yesterday"              | /death_date must match pattern                |
      | death_date        | "2999-01-01"             | death_date "2999-01-01" is in the future      |
      | registration_date | "not a date"             | /registration_date must match pattern         |
      | last_updated      | "2024-06-31"             | last_updated "2024-06-31" is not a valid ISO 8601 calendar date |

    Examples: Places
      | attribute                  | value                                      | error                                         |
      | birth_place                | "Madrid"                                   | /birth_place must be object                   |
      | birth_place.geo            | {"latitude":91,"longitude":0}              | /birth_place/geo/latitude must be <= 90       |
      | birth_place.geo            | {"latitude":0,"longitude":-181}            | /birth_place/geo/longitude must be >= -180    |
      | birth_place.geo            | {"latitude":"40.4","longitude":"-3.6"}     | /birth_place/geo/latitude must be number      |
      | birth_place.geo            | {"latitude":40.4}                          | /birth_place/geo must have required property 'longitude' |
      | birth_place.contains_place | {"name":"Ward"}                            | /birth_place/contains_place must be array     |
      | death_place                | "Home"                                     | /death_place must NOT have more than 0 characters |
      | death_place                | {"geo":{"latitude":100,"longitude":0}}     | /death_place/geo/latitude must be <= 90       |

    Examples: Address
      | attribute                                         | value                                   | error                                              |
      | address                                           | "Bophut Koh Samui"                      | /address must be object                            |
      | address                                           | []                                      | /address must NOT have fewer than 1 items          |
      | address.country_code                              | "Thailand"                              | /address/country_code must match pattern           |
      | address.country_code                              | "th"                                    | /address/country_code must match pattern           |
      | address.postal_code                               | 84320                                   | /address/postal_code must be string                |
      | address.locality                                  | ["Thani"]                               | /address/locality must be string                   |
      | address.geo_location.plus_code.global_code        | "not-a-plus-code"                       | /address/geo_location/plus_code/global_code must match pattern |
      | address.geo_location.plus_code.geometry.location  | {"latitude":-91,"longitude":0}          | /address/geo_location/plus_code/geometry/location/latitude must be >= -90 |
      | address.geo_location.plus_code.geometry.bounds    | {"northeast":{"latitude":1,"longitude":1},"southwest":{"latitude":2,"longitude":0}} | northeast.latitude 1 is south of southwest.latitude 2 |

    Examples: Linked data keywords
      | attribute | value | error                       |
      | @id       | 3     | /@id must be string         |
      | @type     | {}    | /@type must be string       |
      | @context  | 42    | /@context must be string,object |

  # ---------------------------------------------------------------------------
  # Cross-attribute consistency (only checked when the attributes are sent)
  # ---------------------------------------------------------------------------
  Scenario Outline: Life events must be chronological and consistent: <rule>
    Given the "<record>" CRVS person record
    When its "<attribute>" attribute is set to '<value>'
    Then the person record should be rejected because of "<error>"

    Examples:
      | rule                                   | record   | attribute         | value          | error                                            |
      | death before birth                     | deceased | death_date        | "1939-01-01"   | death_date 1939-01-01 is before birth_date 1940-02-11 |
      | marriage before birth                  | married  | marriage_date     | "1990-01-01"   | marriage_date 1990-01-01 is before birth_date 1992-07-14 |
      | marriage after death                   | deceased | marriage_date     | "2024-12-01"   | marriage_date 2024-12-01 is after death_date 2024-11-02 |
      | divorce before marriage                | divorced | divorce_date      | ["2000-01-01"] | divorce_date 2000-01-01 is before the first marriage_date 2001-09-09 |
      | divorce before birth                   | divorced | divorce_date      | "1970-01-01"   | divorce_date 1970-01-01 is before birth_date 1975-01-30 |
      | registration before birth              | newborn  | registration_date | "2025-05-01"   | registration_date 2025-05-01 is before birth_date 2025-06-01 |
      | last update before registration        | full     | last_updated      | "1979-01-01"   | last_updated 1979-01-01 is before registration_date 1980-04-01 |
      | never married but has marriage date    | married  | marital_status    | "S"            | marital_status "S" (never married) contradicts   |
      | never married but has divorce date     | divorced | marital_status    | "S"            | marital_status "S" (never married) contradicts   |

  Scenario Outline: Consistent life events are accepted: <case>
    Given the "<record>" CRVS person record
    When its "<attribute>" attribute is set to '<value>'
    Then the person record should be valid

    Examples:
      | case                                | record    | attribute     | value                        |
      | death on the day of birth           | stillborn | death_date    | "2025-02-02T08:00:00Z"       |
      | several marriages as a list         | divorced  | marriage_date | ["2001-09-09","2018-01-01"]  |
      | remarried after divorce             | divorced  | marital_status| "M"                          |
      | single with empty event placeholders| full      | marriage_date | ""                           |

  # ---------------------------------------------------------------------------
  # Encrypted payloads
  # ---------------------------------------------------------------------------
  Scenario Outline: An encrypted "<action>" message must be a complete EncryptedMessage
    Given an encrypted "<action>" message
    Then the encrypted message should be valid

    Examples:
      | action        |
      | on-search     |
      | notify        |
      | txn-on-status |

  Scenario Outline: An encrypted message missing "<field>" is rejected
    Given an encrypted "on-search" message
    When its encrypted field "<field>" is removed
    Then the encrypted message should be rejected because of "<error>"

    Examples:
      | field         | error                                            |
      | ciphertext    | must have required property 'ciphertext'         |
      | encrypted_key | must have required property 'encrypted_key'      |
      | tag           | must have required property 'tag'                |
      | iv            | must have required property 'iv'                 |
      | header        | /message must have required property 'header'    |
      | header.kid    | /message/header must have required property 'kid' |
