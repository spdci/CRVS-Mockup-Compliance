// CRVS person records covering every data profile of the standard: from a record carrying
// only an identifier up to one carrying every optional attribute, plus each vital event
// (birth, death, fetal death, marriage, divorce, widowhood).
//
// They are used by the tests (payloads sent to SP endpoints, reference record for the data
// rules matrix) and by mock/generate-mocks.mjs (records returned by the mock CRVS), so the
// mock and the tests always agree on the data.

const context = {
  '@vocab': 'https://schema.spdci.org/common/v1',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  schema: 'http://schema.org/',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
};

const id = (identifier_type, identifier_value) => ({ '@type': 'Identifier', identifier_type, identifier_value });

// Verbatim CRVSPerson example from crvs_api_v1.0.0.yaml (including its "" placeholders).
export const specExample = {
  '@context': context,
  '@id': 'CRVS_Person_3',
  '@type': 'CRVS_Person',
  identifier: [{ '@id': 'Identifier', '@type': 'Identifier', identifier_type: 'UIN', identifier_value: '197382465' }],
  name: { '@type': 'Name', surname: 'Martinez', given_name: 'Elena', second_name: '', prefix: 'Dr.', suffix: 'PhD' },
  phone_number: ['+34612345678'],
  email: ['elena.martinez@example.com'],
  sex: 'female',
  birth_date: '1980-03-23T10:20:15',
  birth_place: {
    name: 'hospital/Madrid_Central',
    geo: { '@type': 'GeoCoordinates', latitude: 9.5604, longitude: 100.0245 },
    address_line: '',
    contained_in_place: '',
    contains_place: [
      {
        '@id': 'Place_3',
        '@type': 'Place',
        name: 'Pattaya Floating Market',
        address: 'Bophut Koh Samui Surat Thani 84320 Thailand',
        geo: { '@type': 'GeoCoordinates', latitude: 9.5617, longitude: 100.0259 },
      },
    ],
  },
  death_date: '',
  death_place: '',
  address: {
    '@id': 'Address_1',
    '@type': 'Address',
    address_line1: 'Bophut Koh Samui',
    address_line2: 'Surat, Near Big Buddha Beach',
    locality: 'Thani',
    sub_region_code: 'SH',
    region_code: 'A205',
    postal_code: '84320',
    country_code: 'TH',
    geo_location: {
      '@id': 'GeoLocation_1',
      '@type': 'GeoLocation',
      plus_code: {
        global_code: '8FW4V900+',
        geometry: {
          '@id': 'geometry',
          '@type': 'GeoLocation',
          bounds: {
            '@id': 'bounds',
            '@type': 'geometry',
            northeast: { '@id': 'northeast', '@type': 'GeoCoordinates', latitude: 48.900000000000006, longitude: 2.4000000000000057 },
            southwest: { '@id': 'southwest', '@type': 'GeoCoordinates', latitude: 48.849999999999994, longitude: 2.3499999999999943 },
          },
          location: { '@id': 'location', '@type': 'GeoCoordinates', latitude: 48.875, longitude: 2.375 },
        },
      },
    },
  },
  marital_status: 'S',
  marriage_date: '',
  divorce_date: '',
  parent1_identifier: { '@id': 'Identifier', '@type': 'Identifier', identifier_type: 'UIN', identifier_value: '537564821' },
  parent2_identifier: { '@id': 'Identifier', '@type': 'Identifier', identifier_type: 'UIN', identifier_value: '564582793' },
};

export const persons = {
  // Every optional attribute present with a correct value.
  full: {
    '@context': context,
    '@id': 'CRVS_Person_1',
    '@type': 'CRVS_Person',
    identifier: [id('UIN', '700000007'), id('BRN', 'BRN1980000777')],
    name: { '@type': 'Name', surname: 'Martinez', given_name: 'Elena', second_name: 'Lucia', maiden_name: 'Garcia', prefix: 'Dr.', suffix: 'PhD' },
    phone_number: ['+34612345678'],
    email: ['elena.martinez@example.com'],
    sex: 'female',
    birth_date: '1980-03-23T10:20:15',
    birth_place: {
      '@type': 'Place',
      name: 'hospital/Madrid_Central',
      address_line: 'Calle de Atocha 1, Madrid',
      geo: { '@type': 'GeoCoordinates', latitude: 40.4085, longitude: -3.6922 },
      contained_in_place: { '@type': 'Place', name: 'Madrid' },
      contains_place: [{ '@type': 'Place', name: 'Maternity ward', geo: { '@type': 'GeoCoordinates', latitude: 40.4086, longitude: -3.6921 } }],
    },
    address: {
      '@id': 'Address_1',
      '@type': 'Address',
      address_line1: 'Bophut Koh Samui',
      address_line2: 'Surat, Near Big Buddha Beach',
      locality: 'Thani',
      sub_region_code: 'SH',
      region_code: 'A205',
      postal_code: '84320',
      country_code: 'TH',
      geo_location: specExample.address.geo_location,
    },
    marital_status: 'S',
    parent1_identifier: id('UIN', '537564821'),
    parent2_identifier: id('UIN', '564582793'),
    registration_date: '1980-04-01',
    last_updated: '2024-06-15T10:00:00Z',
  },

  // Only an identifier: every other attribute is optional.
  minimal: {
    identifier: [id('UIN', '100000001')],
  },

  // Live birth: birth registration number, place of birth, both parents.
  newborn: {
    '@type': 'CRVS_Person',
    identifier: [id('BRN', 'BRN2025000001')],
    name: { surname: 'Okafor', given_name: 'Amara' },
    sex: 'female',
    birth_date: '2025-06-01T04:12:00+01:00',
    birth_place: { name: 'Lagos General Hospital', geo: { latitude: 6.4541, longitude: 3.3947 } },
    address: [{ address_line_1: '12 Marina Road', locality: 'Lagos', region_code: 'LA', country_code: 'NG' }],
    parent1_identifier: id('UIN', '200000002'),
    parent2_identifier: id('UIN', '200000003'),
    registration_date: '2025-06-10',
  },

  // Death: death registration number, death date and place.
  deceased: {
    '@type': 'CRVS_Person',
    identifier: [id('UIN', '500000005'), id('DRN', 'DRN2024000123')],
    name: { surname: 'Nkosi', given_name: 'Thabo' },
    sex: 'male',
    birth_date: '1940-02-11',
    death_date: '2024-11-02T23:40:00Z',
    death_place: { name: 'Home', address_line: '45 Vilakazi Street, Soweto', geo: { latitude: -26.2381, longitude: 27.9086 } },
    marital_status: 'M',
    marriage_date: '1965-08-14',
    registration_date: '1940-03-01',
    last_updated: '2024-11-05',
  },

  // Fetal death: birth and death on the same day, sex unknown.
  stillborn: {
    identifier: [id('BRN', 'BRN2025000099'), id('DRN', 'DRN2025000099')],
    sex: 'unknown',
    birth_date: '2025-02-02',
    death_date: '2025-02-02',
    parent1_identifier: id('UIN', '200000004'),
  },

  // Marriage: marriage registration number and date.
  married: {
    '@type': 'CRVS_Person',
    identifier: [id('UIN', '200000002'), id('MRN', 'MRN2018000456')],
    name: { surname: 'Okafor', given_name: 'Ngozi', maiden_name: 'Adeyemi' },
    sex: 'female',
    birth_date: '1992-07-14',
    marital_status: 'M',
    marriage_date: '2018-05-20',
    phone_number: ['+2348031234567'],
    email: ['ngozi.okafor@example.org'],
  },

  // Divorce: marriage followed by divorce, both dates as lists (core Person @list form).
  divorced: {
    identifier: [id('UIN', '300000003')],
    name: { surname: 'Dubois', given_name: 'Marc' },
    sex: 'male',
    birth_date: '1975-01-30',
    marital_status: 'D',
    marriage_date: ['2001-09-09'],
    divorce_date: ['2015-03-03'],
  },

  // Widowhood.
  widow: {
    identifier: [id('UIN', '600000006')],
    name: { surname: 'Nkosi', given_name: 'Lindiwe' },
    sex: 'female',
    birth_date: '1945-05-05',
    marital_status: 'W',
    marriage_date: '1965-08-14',
  },

  // Several identifiers, phones, e-mails and addresses (list forms, core naming).
  multi: {
    identifier: [id('UIN', '400000004'), id('BRN', 'BRN1988004444')],
    name: { given_name: 'Aisha' },
    sex: 'other',
    birth_date: '1988-12-01',
    phone_number: ['+96170123456', '+33612345678'],
    email: ['aisha@example.com', 'a.other@example.net'],
    address: [
      { address_line_1: 'Rue Hamra 10', locality: 'Beirut', country_code: 'LB' },
      { address_line_1: '5 Rue de Rivoli', postal_code: '75001', locality: 'Paris', country_code: 'FRA' },
    ],
    marital_status: 'U',
  },
};

// Persons returned by the predicate search used in the tests:
//   sex eq "female" AND birth_date ge "1980-01-01"
export const femaleBornSince1980 = [persons.full, persons.married, persons.newborn];

// Identifier → person index, as a CRVS would resolve an idtype-value query.
export function personsByIdentifier() {
  const index = {};
  for (const person of Object.values(persons)) {
    for (const identifier of person.identifier) {
      (index[identifier.identifier_value] ??= []).push(person);
    }
  }
  return index;
}
