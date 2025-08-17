polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  editNotifications: Ember.A([]),
  submissionNotifications: Ember.A([]),
  timezone: Ember.computed('Intl', function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }),

  // Unified data structure for single list interface (Design Meeting requirement)
  unifiedResults: Ember.computed.alias('details.unifiedResults'),

  // Independent submission state object for form data
  submissionState: Ember.computed(function () {
    return Ember.Object.create({
      description: '',
      score: 50,
      selectedTags: Ember.A([])
    });
  }),

  // Component initialization with error protection
  init() {
    this._super(...arguments);

    try {
      this.set('state', { errorMessage: '', errorTitle: '' });

      // Debug logging for troubleshooting
      console.log('OpenCTI IOC Submission component initialized:', {
        notifications:
          !!this.get('editNotifications.length') ||
          !!this.get('submissionNotifications.length'),
        unifiedResults: !!this.get('unifiedResults'),
        hasDetails: !!this.get('details')
      });

      this.refreshCanAddToSubmit();
    } catch (error) {
      console.error('Component initialization error:', error);
      // Ensure basic functionality even with initialization errors
      this.set('editNotifications', Ember.A([]));
      this.set('submissionNotifications', Ember.A([]));
    }
  },
  selectedTags: Ember.computed.alias('submissionState.selectedTags'),
  isDeleting: false,
  resultToDelete: {},
  deleteObservable: false,
  deleteIndicator: false,
  showEditModal: false,
  isEditing: false,
  resultToEdit: {},
  editFormData: Ember.computed('resultToEdit', function () {
    const result = this.get('resultToEdit');
    return Ember.Object.create({
      score: result.score || 50,
      description: result.description || ''
    });
  }),
  createMessage: '',
  createErrorMessage: '',
  createIsRunning: false,
  selectedTag: [],
  editingTags: false,
  previousTagSearch: '',
  existingTags: Ember.A([]),
  interactionDisabled: Ember.computed(
    'isDeleting',
    'createIsRunning',
    'isEditing',
    function () {
      const interactionDisabled =
        this.get('isDeleting') ||
        this.get('showOwnershipMessage') ||
        this.get('createIsRunning') ||
        this.get('isEditing');

      return interactionDisabled;
    }
  ),
  noNewOrChangedIOCToSubmit: Ember.computed(
    'unifiedResults.@each.__toBeSubmitted',
    'unifiedResults.@each.__submitAsObservable',
    'unifiedResults.@each.__submitAsIndicator',
    function () {
      return !this.get('unifiedResults')
        .filter(
          (ioc) =>
            ioc.__toBeSubmitted && (ioc.__submitAsObservable || ioc.__submitAsIndicator)
        )
        .some((ioc) => {
          const isNew = !ioc.isIndicator && !ioc.isObservable;

          const submissionState = this.get('submissionState');
          const hasChanged =
            ioc.score !== submissionState.score ||
            ioc.description !== submissionState.description ||
            this.getLabelsHaveChangedForIoc(ioc);

          return isNew || hasChanged;
        });
    }
  ),

  getLabelsHaveChangedForIoc: function (ioc) {
    const iocLabels = (ioc.labels || []).map(({ value }) => value);
    const submissionStateLabels = (this.get('submissionState').selectedTags || []).map(
      ({ value }) => value
    );
    const hasChanged = !(
      (submissionStateLabels.length || iocLabels.length) &&
      iocLabels.every((label) => submissionStateLabels.includes(label)) &&
      submissionStateLabels.every((label) => iocLabels.includes(label))
    );
    return hasChanged;
  },

  // Permission checking computed properties
  hasAnyDeletionPermissions: Ember.computed(
    'block.userOptions.deletionPermissions',
    function () {
      const deletionPermissions = this.get('block.userOptions.deletionPermissions');
      if (!deletionPermissions || !Array.isArray(deletionPermissions)) {
        return false;
      }
      return deletionPermissions.length > 0;
    }
  ),

  // Granular permission checking for specific item types
  hasIndicatorDeletePermission: Ember.computed(
    'block.userOptions.deletionPermissions',
    function () {
      return this.canDeleteItemType(this.get('block.userOptions'), 'indicator');
    }
  ),

  hasObservableDeletePermission: Ember.computed(
    'block.userOptions.deletionPermissions',
    function () {
      return this.canDeleteItemType(this.get('block.userOptions'), 'observable');
    }
  ),

  hasFoundInOpenCTIIndicatorsAvailableToSubmit: Ember.computed(
    'unifiedResults.@each.__toBeSubmitted',
    'unifiedResults.@each.__isOnExclusionList',
    'unifiedResults.@each.foundInOpenCTI',
    'unifiedResults.@each.canAddToSubmit',
    function () {
      return this.get('unifiedResults').some(
        (result) =>
          result.foundInOpenCTI && !result.__toBeSubmitted && result.canAddToSubmit
      );
    }
  ),
  hasNotInOpenCTIIndicatorsAvailableToSubmit: Ember.computed(
    'unifiedResults.@each.__toBeSubmitted',
    'unifiedResults.@each.__isOnExclusionList',
    'unifiedResults.@each.foundInOpenCTI',
    function () {
      return this.get('unifiedResults').some(
        (result) =>
          !result.foundInOpenCTI && !result.__toBeSubmitted && !result.__isOnExclusionList
      );
    }
  ),
  /**
   * Returns true if all indicators that are not in OpenCTI have been queued for submission
   * not including indicators that are exclusion listed
   */
  notInOpenCTIIsEmpty: Ember.computed(
    'unifiedResults.@each.__toBeSubmitted',
    'unifiedResults.@each.__isOnExclusionList',
    'unifiedResults.@each.foundInOpenCTI',
    function () {
      return this.get('unifiedResults').every(
        (result) =>
          (result.__toBeSubmitted && !result.foundInOpenCTI) || result.foundInOpenCTI
      );
    }
  ),
  foundInOpenCTIIsEmpty: Ember.computed(
    'unifiedResults.@each.__toBeSubmitted',
    'unifiedResults.@each.__isOnExclusionList',
    'unifiedResults.@each.foundInOpenCTI',
    function () {
      return this.get('unifiedResults').every(
        (result) =>
          (result.__toBeSubmitted && result.foundInOpenCTI) || !result.foundInOpenCTI
      );
    }
  ),
  numberOfIndicatorsToBeSubmitted: Ember.computed(
    'unifiedResults.@each.__toBeSubmitted',
    function () {
      return this.get('unifiedResults').reduce((count, result) => {
        return result.__toBeSubmitted ? count + 1 : count;
      }, 0);
    }
  ),
  /**
   * Returns true if any indicators are marked to be submitted
   */
  hasIndicatorToBeSubmitted: Ember.computed(
    'unifiedResults.@each.__toBeSubmitted',
    function () {
      return this.get('unifiedResults').some((result) => result.__toBeSubmitted);
    }
  ),

  /**
   * OpenCTI-Specific Error Handling
   * Converts technical OpenCTI errors into user-friendly messages
   */
  parseOpenCTIError: function (error) {
    if (!error) return 'Unknown error occurred';

    // Check for common OpenCTI error patterns
    if (error.detail) {
      // Server returned structured error
      if (error.detail.includes('Authentication')) {
        return 'Authentication failed. Please check your OpenCTI credentials.';
      }
      if (error.detail.includes('Authorization') || error.detail.includes('permission')) {
        return 'Access denied. You do not have permission to perform this action.';
      }
      if (error.detail.includes('Network') || error.detail.includes('ECONNREFUSED')) {
        return 'Cannot connect to OpenCTI server. Please check the server URL and network connectivity.';
      }
      if (error.detail.includes('Rate limit') || error.detail.includes('rate_limit')) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      if (error.detail.includes('Validation') || error.detail.includes('Invalid')) {
        return 'Invalid data provided. Please check your input and try again.';
      }
      return error.detail;
    }

    // Check error message field
    if (error.message) {
      if (error.message.includes('GraphQL')) {
        return 'OpenCTI server returned an error. Please check your configuration.';
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out. The OpenCTI server may be slow to respond.';
      }
      return error.message;
    }

    // Check nested error structures
    if (error.err) {
      return this.parseOpenCTIError(error.err);
    }

    // Fallback to any available error information
    return error.title || error.description || JSON.stringify(error);
  },

  /**
   * Helper function to check if deletion is allowed for specific item type
   * Mirrors server-side permission logic for consistent behavior
   * @param {Object} userOptions - User configuration options
   * @param {string} itemType - Type of item ('indicator' or 'observable')
   * @returns {boolean} - Whether deletion is allowed for the specified item type
   */
  canDeleteItemType(userOptions, itemType) {
    if (!userOptions || !userOptions.deletionPermissions) {
      return false;
    }

    if (!Array.isArray(userOptions.deletionPermissions)) {
      return false;
    }

    return userOptions.deletionPermissions.some((permission) => {
      const permValue = permission.value || permission;
      // Handle both singular and plural forms
      return permValue === itemType + 's' || permValue === itemType;
    });
  },

  /**
   * Returns true if any indicators are not in OpenCTI
   */
  hasIndicatorNotInOpenCTI: Ember.computed(
    'unifiedResults.@each.foundInOpenCTI',
    function () {
      return this.get('unifiedResults').some((result) => !result.foundInOpenCTI);
    }
  ),
  hasIndicatorsInOpenCTI: Ember.computed(
    'unifiedResults.@each.foundInOpenCTI',
    function () {
      return this.get('unifiedResults').some((result) => result.foundInOpenCTI);
    }
  ),
  searchTags: function (term, resolve, reject) {
    this.searchTagsRequest(term, resolve, reject);
  },
  /**
   * Flash a message on the screen for a specific issue
   * @param message
   * @param type 'info', 'danger', or 'success'
   */
  flashMessage(message, type = 'info', duration = 3000) {
    this.flashMessages.add({
      message: `${this.block.acronym}: ${message}`,
      type: `unv-${type}`,
      icon:
        type === 'success'
          ? 'check-circle'
          : type === 'danger'
          ? 'exclamation-circle'
          : 'info-circle',
      timeout: duration
    });
  },
  refreshCanAddToSubmit: function () {
    console.info('!!! refreshCanAddToSubmit', this.get('unifiedResults'));
    this.get('unifiedResults').forEach((result, index) => {
      const isUnique = !this.get('unifiedResults').some(
        (otherResult, otherIndex) =>
          otherIndex !== index && otherResult.entityValue === result.entityValue
      );
      this.set(`unifiedResults.${index}.canAddToSubmit`, isUnique);
    });
  },

  /**
   * Simple direct array access following ThreatConnect pattern
   * No complex state synchronization needed with backend-provided results array
   */

  actions: {
    dismissNotification: function (notification) {
      this.get('editNotifications').removeObject(notification);
      this.get('submissionNotifications').removeObject(notification);
    },
    initiateItemDeletion: function (result) {
      this.set('resultToDelete', result);
      // Initialize checkbox states based on what exists
      this.set('deleteObservable', result.hasObservables || false);
      this.set('deleteIndicator', result.hasIndicators || false);
      this.set('showDeletionModal', true);
    },
    cancelItemDeletion: function () {
      this.set('showDeletionModal', false);
      this.set('resultToDelete', {});
      this.set('deleteObservable', false);
      this.set('deleteIndicator', false);
    },
    initiateItemEdit: function (result) {
      this.set('resultToEdit', result);
      this.set('showEditModal', true);
    },
    cancelItemEdit: function () {
      this.set('showEditModal', false);
      this.set('resultToEdit', {});
      this.set('isEditing', false);
    },
    saveItemEdit: function () {
      this.editItemRequest();
    },
    confirmDelete: function () {
      this.deleteItemRequest();
    },
    removeAllToBeSubmitted: function () {
      this.get('unifiedResults').forEach((result, index) => {
        this.set(`unifiedResults.${index}.__toBeSubmitted`, false);
        this.set(`unifiedResults.${index}.__submitAsObservable`, false);
        this.set(`unifiedResults.${index}.__submitAsIndicator`, false);
      });
    },
    addToSubmissionList: function (result, index) {
      this.set(`unifiedResults.${index}.__toBeSubmitted`, true);
      if (result.isIndicator) {
        this.set(`unifiedResults.${index}.__submitAsObservable`, true);
      } else if (result.isObservable) {
        this.set(`unifiedResults.${index}.__submitAsIndicator`, true);
      }
    },
    removeFromSubmissionList: function (result, index) {
      this.set(`unifiedResults.${index}.__toBeSubmitted`, false);
      this.set(`unifiedResults.${index}.__submitAsObservable`, false);
      this.set(`unifiedResults.${index}.__submitAsIndicator`, false);
    },
    addAllNotInOpenCTIBeSubmitted: function () {
      this.get('unifiedResults').forEach((result, index) => {
        if (!result.foundInOpenCTI && !result.__isOnExclusionList) {
          this.set(`unifiedResults.${index}.__toBeSubmitted`, true);
        }
      });
    },
    addAllCurrentlyInOpenCTIToBeSubmitted: function () {
      this.get('unifiedResults').forEach((result, index) => {
        if (
          result.foundInOpenCTI &&
          !result.__isOnExclusionList &&
          result.canAddToSubmit
        ) {
          this.set(`unifiedResults.${index}.__toBeSubmitted`, true);
        }
      });
    },
    submitItems: function () {
      this.submitItemsRequest();
    },
    deleteTag: function (tagToDelete) {
      this.set(
        'selectedTags',
        this.get('selectedTags').filter(
          (selectedTag) => selectedTag.value !== tagToDelete.value
        )
      );
    },
    searchTags: function (term) {
      return new Ember.RSVP.Promise((resolve, reject) => {
        Ember.run.debounce(this, this.searchTags, term, resolve, reject, 600);
      });
    },
    addTags: function () {
      const selectedTag = this.get('selectedTag');
      const selectedTags = this.get('selectedTags');

      this.set('createMessage', '');

      let newSelectedTags = selectedTag.filter(
        (tag) =>
          !selectedTags.some(
            (selectedTag) =>
              tag.value.toLowerCase().trim() === selectedTag.value.toLowerCase().trim()
          )
      );

      this.set('selectedTags', selectedTags.concat(newSelectedTags));
      this.set('selectedTag', []);
      this.set('editingTags', false);
    },
    resetSubmissionOptions: function () {
      this.set('submissionState.score', 50);
      this.set('submissionState.description', '');
      this.set('selectedTags', Ember.A([]));
    }
  },
  submitItemsRequest: function () {
    if (!this.get('hasIndicatorToBeSubmitted')) {
      this.flashMessage('No indicators selected for submission', 'info');
      return;
    }

    this.set('createMessage', '');
    this.set('createErrorMessage', '');
    this.set('createIsRunning', true);

    const submissionData = this.get('submissionState');
    const resultsArray = this.get('unifiedResults');

    const iocsToEditAndCreate = resultsArray.filter(
      (result) =>
        result.__toBeSubmitted &&
        (result.__submitAsObservable || result.__submitAsIndicator)
    );

    if (iocsToEditAndCreate.length === 0) {
      this.flashMessage(
        'No IOCs/Types to submit. Add to submit and select a Type box',
        'info',
        3000
      );
      this.set('createIsRunning', false);
      return;
    }

    const submissionScore = submissionData.get('score');
    const submissionDescription = submissionData.get('description');
    const submissionLabelIds = submissionData.get('selectedTags').map((tag) => tag.id);

    if (!submissionScore || submissionScore < 0 || submissionScore > 100) {
      this.flashMessage('Score must be between 0 and 100', 'danger', 3000);
      this.set('createIsRunning', false);
      return;
    }

    // Compute attempted operations for accurate failure counts
    const attemptedCreates = iocsToEditAndCreate.reduce(
      (sum, ioc) =>
        sum + (ioc.__submitAsIndicator ? 1 : 0) + (ioc.__submitAsObservable ? 1 : 0),
      0
    );

    const payload = {
      action: 'submitIOCs',
      data: {
        iocsToEditAndCreate,
        description: submissionDescription,
        score: submissionScore,
        labels: submissionLabelIds
      }
    };

    this.sendIntegrationMessage(payload)
      .then(({ createdIocs }) => {
        // Remove any IOCs that are not found in OpenCTI but were submitted
        // As these will now be replaced by the newly created indicator/observable
        this.set(
          'unifiedResults',
          this.get('unifiedResults').filter(
            (result) =>
              !(result.foundInOpenCTI === false && result.__toBeSubmitted === true)
          )
        );

        // Go through existing unifiedResults and turn off submission values
        this.get('unifiedResults').forEach((result, index) => {
          this.set(`unifiedResults.${index}.__toBeSubmitted`, false);
          this.set(`unifiedResults.${index}.__submitAsIndicator`, false);
          this.set(`unifiedResults.${index}.__submitAsObservable`, false);
        });

        // Now add in our newly created IOCs
        this.set('unifiedResults', this.get('unifiedResults').concat(createdIocs));

        // Update whether the indicator/observable can be submitted
        this.refreshCanAddToSubmit();

        // Build user feedback message
        let messageType = 'success';
        let message = '';

        if (createdIocs.length > 0) {
          message = `${createdIocs.length} IOC${
            createdIocs.length > 1 ? 's were' : ' was'
          } submitted`;
        }

        // Compute failures based on attempted vs successful operations
        const failedCreates = Math.max(attemptedCreates - createdIocs.length, 0);

        if (failedCreates > 0) {
          message += `${message.length > 0 ? ' | ' : ''}${failedCreates} IOC${
            failedCreates > 1 ? 's' : ''
          } failed to submit`;
          messageType = 'danger';
        }

        this.flashMessage(message, messageType, failedCreates > 0 ? 10000 : 3000);
      })
      .catch((error) => {
        console.error('Error creating indicators', error);
        const userFriendlyError = this.parseOpenCTIError(error);
        this.set('state.errorTitle', 'OpenCTI Submission Failed');
        this.set('state.errorMessage', userFriendlyError);
        this.flashMessage(
          `Failed to submit indicators: ${userFriendlyError}`,
          'danger',
          10000
        );
      })
      .finally(() => {
        this.set('createIsRunning', false);
      });
  },

  deleteItemRequest: function () {
    this.set('isDeleting', true);

    const resultToDelete = this.get('resultToDelete');

    const payload = {
      action: 'deleteIOCByType',
      data: {
        idToDelete: resultToDelete.id,
        type: resultToDelete.type
      }
    };

    this.sendIntegrationMessage(payload)
      .then(({ deletedIocId }) => {
        if (!deletedIocId) {
          this.flashMessage('Failed to delete item', 'danger');
          return;
        }

        if (deletedIocId) {
          const iocsWithDeletedRemoved = this.get('unifiedResults').filter(
            (ioc) => deletedIocId !== ioc.id
          );

          const entityExistsInOpenCTI = iocsWithDeletedRemoved.some(
            (ioc) => ioc.entityValue === resultToDelete.entityValue
          );

          const iocsWithDeletedMoved = entityExistsInOpenCTI
            ? iocsWithDeletedRemoved
            : iocsWithDeletedRemoved.concat({
                entityValue: resultToDelete.entityValue,
                entityType: resultToDelete.entityType,
                canEdit: true,
                foundInOpenCTI: false,
                isIndicator: false,
                isObservable: false
              });
          this.set('unifiedResults', iocsWithDeletedMoved);
          this.refreshCanAddToSubmit();
        }

        // Provide specific feedback about what was deleted
        const message = `Successfully deleted ${resultToDelete.type} data for ${resultToDelete.entityValue}`;

        this.flashMessage(message, 'success');
      })
      .catch((err) => {
        console.error('Error deleting entity', err);
        const userFriendlyError = this.parseOpenCTIError(err);
        this.flashMessage(`Failed to delete entity: ${userFriendlyError}`, 'danger');
      })
      .finally(() => {
        this.set('isDeleting', false);
        this.set('showDeletionModal', false);
        this.set('resultToDelete', {});
      });
  },
  editItemRequest: function () {
    const resultToEdit = this.get('resultToEdit');
    const editFormData = this.get('editFormData');

    this.set('isEditing', true);

    const scoreHasChanged = editFormData.get('score') !== resultToEdit.score;
    const descriptionHasChanged =
      editFormData.get('description') !== resultToEdit.description;

    const nothingChanged = !(scoreHasChanged || descriptionHasChanged);
    if (nothingChanged) {
      this.flashMessage(
        'Nothing was changed from the previous values during Edit',
        'info'
      );
      return;
    }

    const payload = {
      action: 'editIOCByType',
      data: {
        idToEdit: resultToEdit.id,
        type: resultToEdit.type,
        score: scoreHasChanged ? editFormData.get('score') : null,
        description: descriptionHasChanged ? editFormData.get('description') : null
      }
    };

    this.sendIntegrationMessage(payload)
      .then(({ editedIocId }) => {
        console.info('Edit result', { editedIocId, resultToEdit });

        const indexToUpdate = this.get('unifiedResults').findIndex(
          // TODO: fix path we are using to get the editIocId then add back for better true error handing and flashMessage interactivity notifying user of what happened
          (existingResult) => existingResult.id === resultToEdit.id
        );

        if (indexToUpdate >= 0) {
          this.set(`unifiedResults.${indexToUpdate}.score`, editFormData.get('score'));
          this.set(
            `unifiedResults.${indexToUpdate}.description`,
            editFormData.get('description')
          );
        }

        this.flashMessage('Successfully updated item', 'success');
      })
      .catch((err) => {
        console.error('Error editing item', err);
        const userFriendlyError = this.parseOpenCTIError(err);
        this.flashMessage(`Failed to edit item: ${userFriendlyError}`, 'danger');
      })
      .finally(() => {
        this.set('isEditing', false);
        this.set('showEditModal', false);
        this.set('resultToEdit', {});
      });
  },
  searchTagsRequest: function (term, resolve, reject) {
    this.set('createMessage', '');
    this.set('createErrorMessage', '');

    // Prevent running the same search twice in a row.  Can happen if the user opens and closes
    // the tag search power select (which will run empty string searches repeatedly).
    if (term === this.get('previousTagSearch') && this.get('existingTags.length') > 0) {
      return;
    }

    this.sendIntegrationMessage({
      action: 'searchTags',
      data: {
        term,
        selectedTags: this.get('selectedTags')
      }
    })
      .then(({ tags }) => {
        this.set('existingTags', tags);
        this.set('previousTagSearch', term);
      })
      .catch((err) => {
        const userFriendlyError = this.parseOpenCTIError(err);
        this.set('createErrorMessage', `Search Tags Failed: ${userFriendlyError}`);
      })
      .finally(() => {
        setTimeout(() => {
          if (!this.isDestroyed) {
            this.set('createMessage', '');
            this.set('createErrorMessage', '');
          }
        }, 5000);
        if (typeof resolve === 'function') {
          resolve();
        }
      });
  }
});
