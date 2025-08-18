/** Query Builders */

/**
 * Build GraphQL query based on enabled search types
 * @param {boolean} searchIndicators - Whether to include indicators search
 * @param {boolean} searchObservables - Whether to include observables search
 * @returns {string} - Dynamic GraphQL query
 */
const buildSearchQuery = () => {
  let query = 'query GetIndicatorsAndObservables($search: String!, $filters: FilterGroup!) {';

  query += `
    indicators(
      search: $search
      filters: $filters
      first: 50
      orderBy: created_at
      orderMode: desc
    ) {
      edges {
        node {
          id
          standard_id
          entity_type
          pattern
          pattern_type
          creators {
           name
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
          }
          objectLabel {
            value
            color
          }
        }
      }
    }`;

  query += `
    stixCyberObservables(
      search: $search
      filters: $filters
      first: 50
      orderBy: created_at
      orderMode: desc
    ) {
      edges {
        node {
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
          }
          creators {
           name
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
        }
      }
    }`;

  query += '}';
  return query;
};

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

const buildEditMutationForObservable = (id, description, score, labels) => {
  let query = '';

  if (description || score) {
    query += `stixCyberObservableEdit(id: "${id}") {`;
  }

  if (description) {
    query += `
      description: fieldPatch(input: { key: "x_opencti_description", value: "${description}" }) {
        id
      }`;
  }

  if (score) {
    query += `
      score: fieldPatch(input: { key: "x_opencti_score", value: "${score}" }) {
        id
      }`;
  }

  if (description || score) {
    query += `}`;
  }

  if (labels?.length > 0) {
    const labelsToAdd = labels?.filter((label) => label.id).map((label) => `"${label.id}"`).join(',');
    query += `
      labels: stixCoreObjectEdit(id: "${id}") {
        added: relationsAdd(input: {toIds: [${labelsToAdd}], relationship_type: "object-label"}) {
          id
        }
      }`;
  }


  return [
    `mutation EditObservableProperties {
      ${query}
    }`
  ];
};

const buildEditMutationForIndicator = (id, description, score, labels) => {
  const descriptionMutation = description
    ? `
      description: indicatorFieldPatch(
        id: "${id}", 
        input: { key: "description", value: "${description}" }
      ) {
        id
      }`
    : '';

  const scoreMutation = score
    ? `
      score: indicatorFieldPatch(
        id: "${id}", 
        input: { key: "x_opencti_score", value: "${score}" }
      ) {
        id
      }`
    : '';

  const labelsMutation =
    labels?.length > 0
      ? `
      labels: stixCoreObjectEdit(id: "${id}") {
        added: relationsAdd(input: {toIds: [${labelsToAdd}], relationship_type: "object-label"}) {
          id
        }
      }`
      : '';

  return []
    .concat(
      descriptionMutation || labelsMutation
        ? `mutation EditIndicatorDescriptionAndLabels {
            ${descriptionMutation}
            ${labelsMutation}
          }`
        : []
    )
    .concat(
      scoreMutation
        ? `mutation EditIndicatorScore {
            ${scoreMutation}
          }`
        : []
    );
};

const buildEditMutationForType = (type, id, description, score, labels) => {
  if (type === 'indicator') {
    return buildEditMutationForIndicator(id, description, score, labels);
  } else if (type === 'observable') {
    return buildEditMutationForObservable(id, description, score, labels);
  }
};

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
      createdBy: $createdBy
    }) {
      id
      standard_id
      entity_type
      pattern
      pattern_type
      name
      description
      indicator_types
      confidence
      x_opencti_score
      valid_from
      valid_until
      created_at
      updated_at
      createdBy {
        name
      }
      creators {
        name
      }
      objectLabel {
        value
        color
      }
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
    $createdBy: String
  ) {
    stixCyberObservableAdd(
      type: $type

      DomainName: $DomainName
      EmailAddr: $EmailAddr
      StixFile: $StixFile
      IPv4Addr: $IPv4Addr
      IPv6Addr: $IPv6Addr
      MacAddr: $MacAddr
      Url: $Url

      x_opencti_score: $score
      x_opencti_description: $description
      createdBy: $createdBy
      objectLabel: $labels
    ) {
      id
      standard_id
      entity_type
      observable_value
      x_opencti_score
      x_opencti_description
      created_at
      updated_at
      createdBy {
        name
      }
      objectLabel {
        value
        color
      }
    }
  }
`;

const CREATE_MUTATIONS_BY_TYPE = {
  indicator: CREATE_INDICATOR_MUTATION,
  observable: CREATE_OBSERVABLE_MUTATION
};

const buildCreateLabelsMutation = (labels) => `
  mutation CreateLabels {
    ${labels
      .map(
        (
          label
        ) => `${label._graphqlCreationLabel}: labelAdd(input: {value: "${label.value}", color: "#63a830"}) { 
      id
      value
      color
    }`
      )
      .join('\n')}
  }`;

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
`

module.exports = {
  buildSearchQuery,
  SEARCH_TAGS_QUERY,
  DELETE_INDICATOR_MUTATION,
  DELETE_OBSERVABLE_MUTATION,
  DELETE_MUTATIONS_BY_TYPE,
  buildEditMutationForObservable,
  buildEditMutationForIndicator,
  buildEditMutationForType,
  CREATE_INDICATOR_MUTATION,
  CREATE_OBSERVABLE_MUTATION,
  CREATE_MUTATIONS_BY_TYPE,
  buildCreateLabelsMutation,
  LINK_INDICATOR_AND_OBSERVABLE_BY_ID_MUTATION
};
