const _INDICATOR_FIELDS = `
  id
  standard_id
  entity_type
  pattern
  pattern_type
  creators {
   name
   entity_type
  }
  objectMarking {
    id,
    definition,
    x_opencti_color
  }
  confidence
  name
  description
  indicator_types
  x_opencti_score
  valid_from
  valid_until
  created_at
  updated_at
  createdBy {
    name
    entity_type
  }
  objectLabel {
    value
    color
  }
`;

const _OBSERVABLE_FIELDS = `
  id
  standard_id
  entity_type
  observable_value
  x_opencti_description
  x_opencti_score
  created_at
  updated_at
  createdBy {
    name
    entity_type
  }
  objectMarking {
    id,
    definition,
    x_opencti_color
  }
  creators {
   name
   entity_type
  }
  objectLabel {
    value
    color
  }
  ... on HashedObservable {
    hashes {
      algorithm
      hash
    }
  }
  ... on StixFile {
    hashes {
      algorithm
      hash
    }
  }
  ... on Artifact {
    hashes {
      algorithm
      hash
    }
  }
`;

const SEARCH_INDICATORS_AND_OBSERVABLES = `
  query GetIndicatorsAndObservables($search: String!, $filters: FilterGroup!) {  
    indicators(
      search: $search
      filters: $filters
      first: 50
      orderBy: created_at
      orderMode: desc
    ) {
      edges {
        node {
          ${_INDICATOR_FIELDS}
        }
      }
    } 
    stixCyberObservables(
      search: $search
      filters: $filters
      first: 50
      orderBy: created_at
      orderMode: desc
    ) {
      edges {
        node {
          ${_OBSERVABLE_FIELDS}
        }
      }
    }
  }
`;

const GET_OBSERVABLE = `
  query GetObservable($search: String!, $filters: FilterGroup!) {  
    stixCyberObservables(
      search: $search
      filters: $filters
      first: 50
      orderBy: created_at
      orderMode: desc
    ) {
      edges {
        node {
          ${_OBSERVABLE_FIELDS}
        }
      }
    }
  } 
`;

const GET_INDICATOR = `
  query GetIndicator($search: String!, $filters: FilterGroup!) {  
    indicators(
      search: $search
      filters: $filters
      first: 50
      orderBy: created_at
      orderMode: desc
    ) {
      edges {
        node {
          ${_INDICATOR_FIELDS}
        }
      }
    }
  } 
`;

const GET_MARKINGS = `
query RootPrivateQuery {
  me {
    id,
    allowed_marking {
      id
      entity_type
      standard_id
      definition_type
      definition
      x_opencti_color
      x_opencti_order
    }
  }
}`;

/**
 * GraphQL query to search for OpenCTI labels
 */
const SEARCH_TAGS_QUERY = `
  query LabelsQuerySearchQuery(
    $search: String!
    $first: Int!
  ) {
    labels(
      search: $search
      first: $first
    ) {
      edges {
        node {
          id
          value
          color
        }
      }
    }
  }
`;

/**
 * GraphQL mutation to delete an indicator in OpenCTI
 * Based on the pattern from runIocSubmissionQueries.js and iocSubmissionMutations.schema.json
 */
const DELETE_INDICATOR_MUTATION = `
  mutation DeleteIndicator($id: ID!) {
    indicatorDelete(id: $id)
  }
`;

/**
 * GraphQL mutation to delete an observable in OpenCTI
 * Based on the pattern from runIocSubmissionQueries.js and iocSubmissionMutations.schema.json
 * OpenCTI uses the stixCyberObservableEdit mutation with a delete operation
 */
const DELETE_OBSERVABLE_MUTATION = `
  mutation DeleteObservable($id: ID!) {
    stixCyberObservableEdit(id: $id) {
      delete
    }
  }
`;

const DELETE_MUTATIONS_BY_TYPE = {
  indicator: DELETE_INDICATOR_MUTATION,
  observable: DELETE_OBSERVABLE_MUTATION
};

const EDIT_OBSERVABLE = `
  mutation EditObservableProperties(
    $id:ID!,
    $authorId: [Any]! = "",
    $markings: [Any]! = [],
    $score:[Any]! = 0,
    $description:[Any]! = "",
    $patchAuthor:Boolean! = false,
    $patchMarkings: Boolean! = false,
    $patchScore:Boolean! = false,
    $patchDescription:Boolean!= false
  ) {
    stixCyberObservableEdit(id: $id) {
      authorId: fieldPatch(input: { key: "createdBy", value: $authorId }) 
        @include(if: $patchAuthor) {
        createdBy { id, name }
      }
      markings: fieldPatch(input: { key: "objectMarking", value: $markings })
        @include(if: $patchMarkings) {
        id, objectMarking { id, definition }
      }
      score: fieldPatch(input: { key: "x_opencti_score", value: $score })
        @include(if: $patchScore) {
        id, x_opencti_score
      }
      description: fieldPatch(input: { key: "x_opencti_description", value: $description })
        @include(if: $patchDescription) {
        id, x_opencti_description
      }
    }
  }
`;

const EDIT_INDICATOR_MARKINGS = `
  mutation EditIndicatorMarkings($id: ID!, $markings: [Any]!) {
    markings: indicatorFieldPatch(
      id: $id
      input: {key: "objectMarking", value: $markings}
    ) {
      id
      objectMarking {
        id
        definition
      }
    }
  }
`;

const EDIT_INDICATOR_AUTHOR = `
  mutation EditIndicatorAuthor($id: ID!, $authorId: [Any]!) {
    author: indicatorFieldPatch(
      id: $id
      input: {key: "createdBy", value: $authorId}
    ) {
      id
      createdBy {
        id
        name
      }
    }
  }
`;

const EDIT_INDICATOR_DESCRIPTION = `
  mutation EditIndicatorDescription($id: ID!, $description: [Any]!) {
    description: indicatorFieldPatch(
      id: $id
      input: {key: "description", value: $description}
    ) {
      id
      description
    }
  }
`;

const EDIT_INDICATOR_SCORE = `
  mutation EditIndicatorScore($id: ID!, $score: [Any]!) {
    score: indicatorFieldPatch(
      id: $id
      input: {key: "x_opencti_score", value: $score}
    ) {
      id
      x_opencti_score
    }
  }
`;

// const buildEditMutationForIndicator = (id, description, score, labels, authorId, markings) => {
//   const descriptionMutation = description
//     ? `
//       description: indicatorFieldPatch(
//         id: "${id}",
//         input: { key: "description", value: "${description}" }
//       ) {
//         id
//       }`
//     : '';
//
//   const scoreMutation = score
//     ? `
//       score: indicatorFieldPatch(
//         id: "${id}",
//         input: { key: "x_opencti_score", value: "${score}" }
//       ) {
//         id
//       }`
//     : '';
//
//   const createdByMutation = authorId
//       ? `
//       authorId: indicatorFieldPatch(
//         id: "${id}",
//         input: { key: "createdBy", value: "${authorId}" }
//       ) {
//         id
//       }`
//       : '';
//
//   // const labelsMutation =
//   //   labels?.length > 0
//   //     ? `
//   //     labels: stixCoreObjectEdit(id: "${id}") {
//   //       added: relationsAdd(input: {toIds: [${labelsToAdd}], relationship_type: "object-label"}) {
//   //         id
//   //       }
//   //     }`
//   //     : '';
//
//   return []
//     .concat(
//       descriptionMutation
//         ? `mutation EditIndicatorDescriptionAndLabels {
//             ${descriptionMutation}
//           }`
//         : []
//     )
//     .concat(
//       scoreMutation
//         ? `mutation EditIndicatorScore {
//             ${scoreMutation}
//           }`
//         : []
//     )
//       .concat(
//           createdByMutation
//               ? `mutation EditIndicatorScore {
//             ${scoreMutation}
//           }`
//               : []
//       )
// };

// const buildEditMutationForType = (type, id, description, score, labels, authorId, markings) => {
//   if (type === 'indicator') {
//     return buildEditMutationForIndicator(id, description, score, labels, authorId, markings);
//   } else if (type === 'observable') {
//     return buildEditMutationForObservable(id, description, score, labels, authorId, markings);
//   }
// };

/**
 * GraphQL mutation to create a new indicator in OpenCTI
 * Based on the pattern from runIocSubmissionQueries.js and iocSubmissionMutations.schema.json
 */
const CREATE_INDICATOR_MUTATION = `
  mutation CreateIndicator(
    $name: String!
    $pattern: String!
    $pattern_type: String!
    $observableType: String!
    
    $description: String
    $score: Int
    $labels: [String!]
    $markings: [String!]
    $createdBy: String
  ) {
    indicatorAdd(input: {
      name: $name
      pattern: $pattern
      pattern_type: $pattern_type
      x_opencti_main_observable_type: $observableType
      
      description: $description
      x_opencti_score: $score
      objectLabel: $labels
      objectMarking: $markings
      createdBy: $createdBy
    }) {
      ${_INDICATOR_FIELDS}
    }
  }
`;

/**
 * GraphQL mutation to create a new STIX cyber observable in OpenCTI
 * Based on the pattern from runIocSubmissionQueries.js and iocSubmissionMutations.schema.json
 */
const CREATE_OBSERVABLE_MUTATION = `
  mutation CreateObservable(
    $type: String!
    
    $DomainName: DomainNameAddInput
    $EmailAddr: EmailAddrAddInput
    $StixFile: StixFileAddInput
    $IPv4Addr: IPv4AddrAddInput
    $IPv6Addr: IPv6AddrAddInput
    $MacAddr: MacAddrAddInput
    $Url: UrlAddInput

    $score: Int
    $description: String
    $labels: [String!]
    $markings: [String!]
    $createdBy: String
  ) {
    stixCyberObservableAdd(
      type: $type
      DomainName: $DomainName
      EmailAddr: $EmailAddr
      IPv4Addr: $IPv4Addr
      IPv6Addr: $IPv6Addr
      MacAddr: $MacAddr
      Url: $Url
      StixFile: $StixFile
      x_opencti_score: $score
      x_opencti_description: $description
      createdBy: $createdBy
      objectLabel: $labels
      objectMarking: $markings
    ) {
      ${_OBSERVABLE_FIELDS}
    }
  }
`;

const CREATE_MUTATIONS_BY_TYPE = {
  indicator: CREATE_INDICATOR_MUTATION,
  observable: CREATE_OBSERVABLE_MUTATION
};

// const buildCreateLabelsMutation = (labels) => `
//   mutation CreateLabels {
//     ${labels
//       .map(
//         (
//           label
//         ) => `${label._graphqlCreationLabel}: labelAdd(input: {value: "${label.value}", color: "#63a830"}) {
//       id
//       value
//       color
//     }`
//       )
//       .join('\n')}
//   }`;

const LINK_INDICATOR_AND_OBSERVABLE_BY_ID_MUTATION = `
  mutation LinkFromIndicatorToObservableById(
    $indicatorId: StixRef!,
    $observableId: StixRef!
  ) {
    stixCoreRelationshipAdd(
      input: {
        fromId: $indicatorId
        toId: $observableId
        relationship_type: "based-on"
      }
    ) {
      id
      toId
      fromId
    }
  }
`;

const SEARCH_IDENTITIES_QUERY = `
  query IdentitySearchIdentitiesSearchQuery(
    $types: [String]
    $search: String
    $first: Int
  ) {
    identities(types: $types, orderBy: _score, orderMode: desc, search: $search, first: $first) {
      edges {
        node {
          __typename
          id
          standard_id
          identity_class
          name
          entity_type
        }
      },
      pageInfo {
        globalCount
      }
    }
  }
`;

module.exports = {
  SEARCH_INDICATORS_AND_OBSERVABLES,
  GET_OBSERVABLE,
  GET_INDICATOR,
  SEARCH_TAGS_QUERY,
  DELETE_INDICATOR_MUTATION,
  DELETE_OBSERVABLE_MUTATION,
  DELETE_MUTATIONS_BY_TYPE,
  CREATE_INDICATOR_MUTATION,
  CREATE_OBSERVABLE_MUTATION,
  CREATE_MUTATIONS_BY_TYPE,
  LINK_INDICATOR_AND_OBSERVABLE_BY_ID_MUTATION,
  GET_MARKINGS,
  SEARCH_IDENTITIES_QUERY,
  EDIT_OBSERVABLE,
  EDIT_INDICATOR_MARKINGS,
  EDIT_INDICATOR_DESCRIPTION,
  EDIT_INDICATOR_SCORE,
  EDIT_INDICATOR_AUTHOR
};
