/**
 * Created with IntelliJ IDEA.
 * User: christian
 * Date: 10/1/13
 * Time: 10:23 PM
 *
 * Here is the implemented logic of the dialog components.
 *
 * How it works:
 *
 * [ Client ]                -- call -->
 * Dialogs.[desiredFunction] -- send msg --> (maybe including some json to prepare the dialog) --->
 * ----> [ according DialogDirective prepares the dialog and will show it ] --> [ user interaction ]
 * ----> [ the DialogDirective maybe perform a REST call ] --> finally hide and reset the dialog
 */

'use strict';

/**
 *
 * Id some dialogs are needed, use this Dialogs to perform such a modal one. Typically the trading-board or the dash-
 * board are using this Dialogs component.
 *
 * ******************************************************************************************************************* *
 *
 * ATTENTION: DO NOT HARD-WIRE A DIALOG WITH ANOTHER COMPONENT LIKE TRADING-BOARD. THESE DIALOGS ARE ALSO USED BY THE
 * DASHBOARD AND THIS BOARD IS AVAILABLE AT EACH PAGE. THE TRADING-BOARD IS ONLY AVAILABLE AT THE VIEW PAGES.
 *
 * ******************************************************************************************************************* *
 *
 * The normal use case is, that the component itself will perform the server call to do something...
 *
 * NOTE IF CREATING A NEW DIALOG:
 * ##############################
 *
 * Each directive has to register its scope to this external public access
 *
 * To know, which JSON setup data has to be set, have a look to the desired dialog directive. There you will find the
 * needed documentation!
 *
 * ATTENTION:
 * ********** *
 * Why ever it is not a good idea to rename in each dialog the cancel functions to "cancel()". Then sporadic errors are
 * the result !!!!!!
 *
 */
var Dialogs = {
    loginToTrade      : null,
    hotDealInfo       : null,
    askQuestion       : null,
    messageToVisitors : null,
    afterBuyMessage   : null,
    answerQuestion    : null,
    bidRequest        : null,
    ownerBidRequest   : null,
    bidResponse       : null,
    ownerBidResponse  : null,
    priceChange       : null,
    bidHistory        : null
}

/**
 * this service is only relevant for the upcoming dialog-directives. It provides common functionality like open or close
 * a reveal dialog
 */
zmwModule.service('RevealService', ['$rootScope', function($rootScope) {
    return {
        show:  function(id) { $('#' + id).foundation('reveal', 'open'); },

        /**
         * NOTE: This has to be called, if the wipe box is used inside the dialog.
         * otherwise iScroll will not set the correct set height
         */
        forceShow: function(id) { $('#' + id).show(); },
        hide:  function(id) { $('#' + id).foundation('reveal', 'close'); }
    }
}]);

/**
 * The server side wants to show or hide a dialog. For this situation this part will receive the server message to perform
 * desired command ( show or hide )
 */
zmwModule.run(function($rootScope, MsgService, RevealService) {
    MsgService.listenToServerMsg('show-reveal-dialog', function(event, id) { RevealService.show(id); });
    MsgService.listenToServerMsg('hide-reveal-dialog', function(event, id) { RevealService.hide(id); });
});

zmwModule.directive('loginToTradeDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/login-to-trade.html',
        controller: function ($scope, RevealService) {

            var dialogId = 'reveal-login-to-trade';

            // wire this directive with the public access Dialogs components
            Dialogs.loginToTrade = function(data) {
                $scope.data = {
                    loginUrl     : data.loginUrl    // knows the correct url to navigate to the login page
                }
                RevealService.show(dialogId);
            }

            $scope.cancelLoginToTradeDialog = function() { RevealService.hide(dialogId); }

            $scope.loginToTrade = function() {
                window.location.replace($scope.data.loginUrl);
            }

        }
    }
    return dialog;
});

zmwModule.directive('hotDealInfoDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/hot-deal-info.html',
        controller: function ($scope, RevealService) {

            var dialogId = 'reveal-hot-deal-info';

            // wire this directive with the public access Dialogs components
            Dialogs.hotDealInfo = function() {
                RevealService.show(dialogId);
            }

            $scope.cancelHotDealInfo = function() { RevealService.hide(dialogId); }

        }
    }
    return dialog;
});

zmwModule.directive('askQuestionDialog', function () {

    /**
     * The server provides the needed actions ( enum BidBlockingStatus )
     */
    var BidBlockingStatus =  Zmw.finals.tradingBoard.bidBlockingStatus;

    var dialogId = 'reveal-ask-question';
    var notPossibleWhileRunningDialogId = 'reveal-ask-question-not-possible-running-hot-deal';
    var notPossibleWhileFinishedDialogId = 'reveal-ask-question-not-possible-finished-hot-deal';

    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/ask-question.html',
        controller: function ($scope, TradingRestAPI, RevealService) {

            function getDialogId() {

                console.log("ASK == ", $scope.data.bidBlockingStatus)

                switch ($scope.data.bidBlockingStatus) {
                    case BidBlockingStatus.NOT_BLOCKED          : return dialogId;
                    case BidBlockingStatus.ACTIVE_HOT_DEAL      : return dialogId;
                    case BidBlockingStatus.HOT_DEAL_IS_RUNNING  : return notPossibleWhileRunningDialogId;
                    case BidBlockingStatus.ACTIVE_BID_BLOCKING  : return notPossibleWhileFinishedDialogId;
                    default                                     : MessageAPI.errorCommon();
                }

                return '';

            }

            // wire this directive with the public access Dialogs components
            Dialogs.askQuestion = function(data) {
                $scope.data = {
                    question            : '',                     // the question, needs to be empty otherwise impossible to get length
                    propType            : data.propType,          // the property type - important for the server side
                    propId              : data.propId,            // the according property id - important for the server side
                    ownerName           : data.ownerName,         // knows the name of the owner according to the property
                    bidBlockingStatus   : data.bidBlockingStatus  // if this flag is set to true, it is not possible to ask a question, if some the according user is also blocking for a period of time
                }
                RevealService.show(getDialogId());
            }

            $scope.cancelAskQuestion = function() { RevealService.hide(dialogId); }

            $scope.askQuestion = function() {

                var postData = {
                    message    : $scope.data.question,
                    propType    : $scope.data.propType,
                    propId      : $scope.data.propId
                }

                TradingRestAPI.askQuestion({details: postData}).$promise.
                    then(function() {
                        MessageAPI.info('Ihre Frage wird an ' + $scope.data.ownerName  + ' weitergeleitet');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelAskQuestion());
            }
        }
    }
    return dialog;
});

zmwModule.directive('messageToVisitorsDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/message-to-visitors.html',
        controller: function ($scope, TradingRestAPI, RevealService) {

            var dialogId = 'reveal-message-to-visitors';

            // wire this directive with the public access Dialogs components
            Dialogs.messageToVisitors = function(data) {
                $scope.data = {
                    message      : '',                      // the message, needs to be empty otherwise impossible to get length
                    propType     : data.propType,           // the property type - important for the server side
                    propId       : data.propId              // the according property id - important for the server side
                }
                RevealService.show(dialogId);
            }

            $scope.cancelMessageToVisitors = function() { RevealService.hide(dialogId); }

            $scope.messageToVisitors = function() {

                var postData = {
                    message     : $scope.data.message,
                    propType    : $scope.data.propType,
                    propId      : $scope.data.propId
                }

                TradingRestAPI.messageToVisitors({details: postData}).$promise.
                    then(function() {
                        MessageAPI.info('Ihre Nachricht wird allen Besuchern angezeigt');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelMessageToVisitors());
            }

        }
    }
    return dialog;
});

zmwModule.directive('afterBuyMessageDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/after-buy-message.html',
        controller: function ($scope, TradingRestAPI, RevealService) {

            var dialogId = 'reveal-after-buy-message';

            // wire this directive with the public access Dialogs components
            Dialogs.afterBuyMessage = function(data) {
                $scope.data = {      /* TODO check the required data for this message dialog */
                    message      : '',                      // the message, needs to be empty otherwise impossible to get length
                    receiverName : data.receiverName,       // holds the user name who is the receiver for the message
                    propType     : data.propType,           // the property type - important for the server side
                    propId       : data.propId              // the according property id - important for the server side
                }
                RevealService.show(dialogId);
            }

            $scope.cancelAfterBuyMessage = function() { RevealService.hide(dialogId); }

            $scope.afterBuyMessage = function() {

                /* TODO ADAPT THE PARAMS FOR A afterBuyMessage MESSAGE !!! */
                var postData = {
                    message:    $scope.data.message,
                    propType:   $scope.data.propType,
                    propId:     $scope.data.propId
                }

                TradingRestAPI.afterBuyMessage({details: postData}).$promise.
                    then(function() {
                        MessageAPI.info('Ihre private Nachricht wird an ' + $scope.data.receiverName + ' versendet');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelAfterBuyMessage());

            }
        }
    }
    return dialog;
});

zmwModule.directive('answerQuestionDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/answer-question.html',
        controller: function ($scope, TradingRestAPI, RevealService, MsgService) {

            var dialogId = 'reveal-answer-question';

            // wire this directive with the public access Dialogs components
            Dialogs.answerQuestion = function(data) {
                $scope.data = {
                    message           : '',                        // the answer message,  needs to be empty otherwise impossible to get length
                    questionItem      : data.questionItem          // knows the question ( history ) item
                }

                /**
                 * set flag to true to know, that this dialog on this device is opened
                 */
                $scope.isOpened = true;

                /**
                 * If the owner will perform the response with this concrete dialog, it is needed to set a flag. For
                 * more details have a look to the listening message 'answer-item-from-owner'
                 */
                $scope.hasExecuted = false;

                RevealService.show(dialogId);
            }

            $scope.cancelAnswerQuestion = function() {
                $scope.isOpened = false;
                RevealService.hide(dialogId);
            }

            $scope.answerQuestion = function() {

                $scope.hasExecuted = true;

                var postData = {
                    message     : $scope.data.message
                }

                TradingRestAPI.answerQuestion({id: $scope.data.questionItem.id, details: postData}).$promise.
                    then(function() {
                        MessageAPI.info('Ihre Antwort wird an ' + $scope.data.questionItem.actorName + ' versendet');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelAnswerQuestion());

            }

            /**
             * Possibly the owner has opened the same question on two different devices. If the owner will finalize
             * on one device the dialog, the dialog on the other device has to be closed. But only then, if it is used
             * for the same task / item
             */
            MsgService.listenTo('answer-item-from-owner', function(event, answer) {
                // check, if the dialog is opened and handles the same item and has not executed the initial command
                if (!$scope.hasExecuted && $scope.isOpened && $scope.data.questionItem.id == answer.ancestor.id) {
                    $scope.cancelAnswerQuestion();
                    MessageAPI.info('Der Dialog wird geschlossen, da Sie bereits eine Antwort über ein anderes Medium gegeben haben');
                }
            })

        }
    }
    return dialog;
});

zmwModule.directive('bidRequestDialog', function () {

    /**
     * The server provides the needed actions ( enum BidBlockingStatus )
     */
    var BidBlockingStatus =  Zmw.finals.tradingBoard.bidBlockingStatus;

    var dialogId = 'reveal-bid-request';
    var notPossibleWhileActiveHotDealDialogId = 'reveal-bid-request-not-possible-active-hot-deal';
    var notPossibleWhileRunningDialogId = 'reveal-bid-request-not-possible-running-hot-deal';
    var notPossibleWhileFinishedDialogId = 'reveal-bid-request-not-possible-finished-hot-deal';

    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/bid-request.html',
        controller: function ($scope, TradingRestAPI, RevealService, DashboardService, MsgService) {

            function getDialogId() {

                switch ($scope.data.bidBlockingStatus) {
                    case BidBlockingStatus.NOT_BLOCKED          : return dialogId;
                    case BidBlockingStatus.ACTIVE_HOT_DEAL      : return notPossibleWhileActiveHotDealDialogId;
                    case BidBlockingStatus.HOT_DEAL_IS_RUNNING  : return notPossibleWhileRunningDialogId;
                    case BidBlockingStatus.ACTIVE_BID_BLOCKING  : return notPossibleWhileFinishedDialogId;
                    default                                     : MessageAPI.errorCommon();
                }

                return '';

            }

            // wire this directive with the public access Dialogs components
            Dialogs.bidRequest = function(data) {
                $scope.data = {
                    currentPrice      : data.currentPrice,         // knows the current price of the property
                    ownerName         : data.ownerName,            // knows the name of the owner
                    ownerId           : data.ownerId,              // knows the owner id of the property
                    userId            : data.userId,               // knows the user id of this session
                    propType          : data.propType,             // the property type - important for the server side
                    propId            : data.propId,               // the according property id - important for the server side
                    propName          : data.propName,             // knows the name of the according property
                    bidBlockingStatus : data.bidBlockingStatus,    // if this flag is set to true, it is not possible to bear a bid request, while it is not allowed to bear a new one, if some existing hot-deal is still active
                    details           : {                          // will set as a param during the rest call --> see inner case class Details in bearBidRequest method
                        price             : null,                  // the user's bid-request price
                        comment           : '',                    // an additional comment by the user - if no comment is given, set it as undefined during the rest call!
                        hotDeal           : false                  // set the hot-deal flag per default to false
                    },
                    hotDealItem       : data.hotDealItem           // according to BID_BLOCKING_STATUS this dialog also provides a HOT-DEAL-RETREAT procedure. For this
                                                                   // the details of the hot-deal item are required ( is only given if status = BidBlockingStatus.ACTIVE_HOT_DEAL )
                }

                /**
                 * set flag to true. It is needed to handle some server updates
                 */
                $scope.isOpened = true;

                RevealService.show(getDialogId());
            }

            $scope.cancelBidRequest = function() {
                RevealService.hide(getDialogId());
                $scope.isOpened = false;
            }

            function apiCall() {

                var postData = {
                    propType    : $scope.data.propType,
                    propId      : $scope.data.propId,
                    details     : $scope.data.details
                }

                TradingRestAPI.bearBidRequest(postData).$promise.
                    then(function() {
                        MessageAPI.info('Ihr Angebot wird an ' + $scope.data.ownerName + ' versendet');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelBidRequest());
            }

            $scope.bidRequest = function() { apiCall(); }

            $scope.convertPrice = function(price) {
                return JsTools.stringToNumber(price);
            }
            $scope.hotDeal = function() {
                // set the hot deal flag to true
                $scope.data.details.hotDeal = true;
                apiCall();
            }

            $scope.hotDealRetreat = function() {
                DashboardService.hotDealRetreat($scope.data.hotDealItem);
                $scope.cancelBidRequest();
            }

            $scope.hotDealRetreatNotPerformed = function() {
                DashboardService.hotDealRetreatNotPerformed($scope.data.hotDealItem);
            }

            $scope.showBidHistory = function() {
                Dialogs.bidHistory({
                    propType    : $scope.data.propType,
                    propId      : $scope.data.propId,
                    ownerId     : $scope.data.ownerId,
                    userId      : $scope.data.userId
                });
            }

            /**
             * In this bid-request dialog every time it is possible to show the bid history dialog. This function is
             * needed, because a generic template is in use. The ownerBidRequest dialog instead of this one here must
             * check, if it is possible to show the bid history dialog.
             * @returns {boolean}
             */
            $scope.showBidHistoryPossible = function() {
                return true;
            }

            /**
             * possibly the dialog is open. In that case it is needed to update the price, if it is the same property
             */
            MsgService.listenToServerMsg('price-changed', function(event, newPrice) {
                if ($scope.isOpened && $scope.data.propId == newPrice.propId) {
                    $scope.data.currentPrice = newPrice.rawPrice;
                }

            });

        }
    }
    return dialog;

});

zmwModule.directive('bidResponseDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/bid-response.html',
        controller: function ($scope, TradingRestAPI, RevealService, MsgService) {

            var dialogId = 'reveal-bid-response';

            /**
             * while the bid-response and the owner-bid-response are using the same generic templates, the back button
             * id must dynamically be set
             * @type {string}
             */
            $scope.goBackDialogId = dialogId;

            // wire this directive with the public access Dialogs components
            Dialogs.bidResponse = function(data) {
                $scope.data = {
                    bidRequestItem      : data.bidRequestItem,     // holds the needed content of the bid-request item
                    propId              : data.propId,             // value is needed, if a price-change will be invoked inside this dialog
                    propType            : data.propType,           // value is needed, if a price-change will be invoked inside this dialog
                    propName            : data.propName,           // value is needed, if a price-change will be invoked inside this dialog
// TODO: not really needed here ? Think about it again but remember, the trading board holds the propPrice label now! If not, simply remove it here
//                    propPrice           : data.propPrice,          // holds the current price of the property
//                    newPropPrice        : data.propPrice,          // initially holds the same price as propPrice. If this price will be changed to another price, also a price change will be performed ( owner can use multiple devices )
                    declineComment      : ''                       // holds an optional comment, a reason, why the owner has denied the bid request
                }

                /**
                 * if the dialog is opened, set this flag to false, if the owner has opened the dialog and a bid-request
                 * update for the opened bid-request will receive, then set the flag to true to inform the owner about
                 * the update!
                 */
                $scope.bidRequestUpdateIsNeeded = false;

                /**
                 * set flag to true. It is needed to handle a bid-request update. If this flag is true, then the
                 * received message ( a maybe update - if it the original bid-request is opened ) inside this dialog
                 * will be handled. Else
                 */
                $scope.isOpened = true;

                /**
                 * If the owner will perform the response with this concrete dialog, it is needed to set a flag. For
                 * more details have a look to the listening message 'bid-response-item-from-owner'
                 */
                $scope.hasExecuted = false;

                RevealService.show(dialogId);
            }

            /**
             * It is possible, that the trading-board will send a message, if an update of some existing bid-request is
             * received. If this dialog is opened ( check according flag ), hold the given update in this scope. The
             * owner will be informed about the update.
             */
            MsgService.listenTo('bid-request-update', function(event, update) {

                /** check, if the dialog is actually in use by the owner and if the current bid-request is the original
                 * one of given update
                 *
                 * NOTE: It is happened, that the browser has thrown the error, that data.bidRequestItem was not set.
                 * Why ever the dialog was not opened. So safely check for '!= null'
                 */
                if ($scope.isOpened &&
                    $scope.data.bidRequestItem != null &&
                    $scope.data.bidRequestItem.id == update.ancestor.id) {

                    // it is needed to inform the owner about the update!
                    $scope.bidRequestUpdateIsNeeded = true;

                    /** temporary store the given update. The owner has first to press an update button to ensure, that
                     * owner has recongnized the update!
                     */
                    $scope.bidRequestUpdate = update;
                }
            });

            /**
             * Possibly the owner has opened the bid-request dialog for a bid, that is in the same moment retired by the
             * user ( the creator of the bid-request )
             *
             * NOTE: It is happened, that the browser has thrown the error, that data.bidRequestItem was not set.
             * Why ever the dialog was not opened. So safely check for '!= null'
             */
            MsgService.listenTo('bid-request-retired', function(event, retired) {
                if ($scope.isOpened &&
                    $scope.data.bidRequestItem != null &&
                    $scope.data.bidRequestItem.id == retired.ancestor.id) {

                    // TODO HANDLE THIS HERE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    console.log("NOT YET IMPLEMENTED !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

                }
            });

            /**
             * The owner is informed about an update if given bid-request. Simply replace the bidRequestItem with the
             * new update.
             */
            $scope.updateBidRequest = function() {
                // reset the flag
                $scope.bidRequestUpdateIsNeeded = false;

                // update the data
                $scope.data.bidRequestItem = $scope.bidRequestUpdate;

                // reset a may entered decline comment
                $scope.data.declineComment = '';

                // remove the temporary set update item
                $scope.bidRequestUpdate = undefined;
            }

            /**
             * Possibly the owner has opened the decline-confirm-dialog and a update is received. If then the owner
             * press the update button, the owner has to navigated back to the first dialog, which shows the data of
             * the bid-request ( here then from the update )
             */
            $scope.backToModalResponseAndUpdate = function() {
                // perform the update
                $scope.updateBidRequest();

                // navigate back
                RevealService.show(dialogId);
            }

            /**
             * Possibly the owner has opened the same bid-request on two different devices. If the owner will finalize
             * on one device the dialog, the dialog on the other device has to be closed. But only then, if it is used
             * for the same task / item
             */
            MsgService.listenTo('bid-response-item-from-owner', function(event, bidResponse) {
                // check, if the dialog is opened and handles the same item and has not executed the initial command
                if (!$scope.hasExecuted && $scope.isOpened && $scope.data.bidRequestItem.id == bidResponse.ancestor.id) {
                    $scope.cancelBidResponse();
                    MessageAPI.info('Der Dialog wird geschlossen, da Sie bereits eine Antwort über ein anderes Medium gegeben haben');
                }
            })

            $scope.priceValidation = JsTools.priceRegEx;

            $scope.cancelBidResponse = function() {
                RevealService.hide(dialogId);

                /**
                 * set flag to false. It is needed to handle a bid-request update.
                 */
                $scope.isOpened = false;
            }

            $scope.acceptBidRequest = function() {

                // set the execution flag
                $scope.hasExecuted = true;

                var postData = {
                    id: $scope.data.bidRequestItem.id
                }

                TradingRestAPI.acceptBidRequest(postData).$promise.
                    then(function() {
                        MessageAPI.info('Das Angebot von ' + $scope.data.bidRequestItem.actorName + ' wird angenommen');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelBidResponse());
            }

            $scope.declineBidRequest = function() {

                // set the execution flag
                $scope.hasExecuted = true;

                var postData = {
                    id: $scope.data.bidRequestItem.id,
                    comment: $scope.data.declineComment
                }

                TradingRestAPI.declineBidRequest(postData).$promise.
                    then(function() {
                        MessageAPI.info('Das Angebot von ' + $scope.data.bidRequestItem.actorName + ' wird abgelehnt');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelBidResponse());
            }
        }
    }
    return dialog;

});

zmwModule.directive('ownerBidResponseDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/owner-bid-response.html',
        controller: function ($scope, TradingRestAPI, RevealService, MsgService) {

            var dialogId = 'reveal-owner-bid-response';

            /**
             * while the bid-response and the owner-bid-response are using the same generic templates, the back button
             * id must dynamically be set
             * @type {string}
             */
            $scope.goBackDialogId = dialogId;

            // wire this directive with the public access Dialogs components
            Dialogs.ownerBidResponse = function(data) {
                $scope.data = {
                    bidRequestItem      : data.bidRequestItem,     // holds the needed content of the pending owner-bid-request item
                    propId              : data.propId,             // value is needed, if a price-change will be invoked inside this dialog
                    propType            : data.propType,           // value is needed, if a price-change will be invoked inside this dialog
                    propName            : data.propName,           // value is needed, if a price-change will be invoked inside this dialog
// TODO: not really needed here ? Think about it again but remember, the trading board holds the propPrice label now! If not, simply remove it here
//                    propPrice           : data.propPrice,          // holds the current price of the property
//                    newPropPrice        : data.propPrice,          // initially holds the same price as propPrice. If this price will be changed to another price, also a price change will be performed ( owner can use multiple devices )
                    declineComment      : ''                       // holds an optional comment, a reason, why the owner has denied the owner bid request
                }

                /**
                 * if the dialog is opened, set this flag to false, if the owner has opened the dialog and a bid-request
                 * update for the opened bid-request will receive, then set the flag to true to inform the owner about
                 * the update!
                 */
                $scope.bidRequestUpdateIsNeeded = false;

                /**
                 * set flag to true. It is needed to handle a bid-request update. If this flag is true, then the
                 * received message ( a maybe update - if it the original bid-request is opened ) inside this dialog
                 * will be handled. Else
                 */
                $scope.isOpened = true;

                /**
                 * If the owner will perform the response with this concrete dialog, it is needed to set a flag. For
                 * more details have a look to the listening message 'bid-response-item-from-owner'
                 */
                $scope.hasExecuted = false;

                RevealService.show(dialogId);
            }

            /**
             * It is possible, that the trading-board will send a message, if an update of some existing bid-request is
             * received. If this dialog is opened ( check according flag ), hold the given update in this scope. The
             * owner will be informed about the update.
             */
            // TODO might be a 'owner-bid-request-update' adapt / implement it!
            MsgService.listenTo('bid-request-update', function(event, update) {

                /** check, if the dialog is actually in use by the owner and if the current bid-request is the original
                 * one of given update
                 *
                 * NOTE: It is happened, that the browser has thrown the error, that data.bidRequestItem was not set.
                 * Why ever the dialog was not opened. So safely check for '!= null'
                 */
                if ($scope.isOpened &&
                    $scope.data.bidRequestItem != null &&
                    $scope.data.bidRequestItem.id == update.ancestor.id) {

                    // it is needed to inform the owner about the update!
                    $scope.bidRequestUpdateIsNeeded = true;

                    /** temporary store the given update. The owner has first to press an update button to ensure, that
                     * owner has recongnized the update!
                     */
                    $scope.bidRequestUpdate = update;
                }
            });

            /**
             * Possibly the user has opened the owner-bid-request dialog for a bid, that is in the same moment retired by the
             * owner ( the creator of the owner-bid-request )
             *
             * NOTE: It is happened, that the browser has thrown the error, that data.bidRequestItem was not set.
             * Why ever the dialog was not opened. So safely check for '!= null'
             */
                // TODO might be a 'owner-bid-request-retired' adapt / implement it!
            MsgService.listenTo('bid-request-retired', function(event, retired) {
                if ($scope.isOpened &&
                    $scope.data.bidRequestItem != null &&
                    $scope.data.bidRequestItem.id == retired.ancestor.id) {

                    // TODO HANDLE THIS HERE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    console.log("NOT YET IMPLEMENTED !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

                }
            });

            /**
             * The owner is informed about an update if given bid-request. Simply replace the bidRequestItem with the
             * new update.
             */
            $scope.updateBidRequest = function() {
                // reset the flag
                $scope.bidRequestUpdateIsNeeded = false;

                // update the data
                $scope.data.bidRequestItem = $scope.bidRequestUpdate;

                // reset a may entered decline comment
                $scope.data.declineComment = '';

                // remove the temporary set update item
                $scope.bidRequestUpdate = undefined;
            }

            /**
             * Possibly the owner has opened the decline-confirm-dialog and a update is received. If then the owner
             * press the update button, the owner has to navigated back to the first dialog, which shows the data of
             * the bid-request ( here then from the update )
             */
            $scope.backToModalResponseAndUpdate = function() {
                // perform the update
                $scope.updateBidRequest();

                // navigate back
                RevealService.show(dialogId);
            }

            /**
             * Possibly the user has opened the same owner-bid-response on two different devices. If the user will finalize
             * on one device the dialog, the dialog on the other device has to be closed. But only then, if it is used
             * for the same task / item
             */
            // TODO might be 'owner-bid-response-item-from-recipient' adpapt / implement it
            MsgService.listenTo('bid-response-item-from-owner', function(event, bidResponse) {
                // check, if the dialog is opened and handles the same item and has not executed the initial command
                if (!$scope.hasExecuted && $scope.isOpened && $scope.data.bidRequestItem.id == bidResponse.ancestor.id) {
                    $scope.cancelBidResponse();
                    MessageAPI.info('Der Dialog wird geschlossen, da Sie bereits eine Antwort über ein anderes Medium gegeben haben');
                }
            })

            $scope.priceValidation = JsTools.priceRegEx;

            $scope.cancelBidResponse = function() {
                RevealService.hide(dialogId);

                /**
                 * set flag to false. It is needed to handle a bid-request update.
                 */
                $scope.isOpened = false;
            }

            $scope.acceptBidRequest = function() {

                // set the execution flag
                $scope.hasExecuted = true;

                var postData = {
                    id: $scope.data.bidRequestItem.id
                }

                TradingRestAPI.acceptBidRequest(postData).$promise.
                    then(function() {
                        MessageAPI.info('Das Angebot von ' + $scope.data.bidRequestItem.actorName + ' wird angenommen');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelBidResponse());
            }

            $scope.declineBidRequest = function() {

                // set the execution flag
                $scope.hasExecuted = true;

                var postData = {
                    id: $scope.data.bidRequestItem.id,
                    comment: $scope.data.declineComment
                }

                TradingRestAPI.declineBidRequest(postData).$promise.
                    then(function() {
                        MessageAPI.info('Das Angebot von ' + $scope.data.bidRequestItem.actorName + ' wird abgelehnt');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelBidResponse());
            }
        }
    }
    return dialog;

});

zmwModule.directive('priceChangeDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/price-change.html',
        controller: function ($scope, TradingRestAPI, RevealService) {

            var dialogId = 'reveal-price-change';

            // wire this directive with the public access Dialogs components
            Dialogs.priceChange = function(data) {
                $scope.data = {
                    currentPrice      : data.currentPrice,         // knows the current price of the property
                    propType          : data.propType,             // the property type - important for the server side
                    propId            : data.propId,               // the according property id - important for the server side
                    propName          : data.propName,             // knows the name of the according property
                    details           : {                          // will set as a param during the rest call --> see inner case class Details in bearBidRequest method
                        newPrice          : null                   // will be set as the new price
                    }
                }

                RevealService.show(dialogId);
            }

            $scope.cancelPriceChange = function() {RevealService.hide(dialogId); }

            $scope.priceChange = function() {

                $scope.data.details.newPrice = JsTools.stringToNumber($scope.data.details.newPrice);

                var postData = {
                    propType        : $scope.data.propType,
                    propId          : $scope.data.propId,
                    details         : $scope.data.details
                }

                TradingRestAPI.priceChange(postData).$promise.
                    then(function() {
                        //TODO if price was "zu verschenken" then data.currentPrice is undefined
                        MessageAPI.info('Der Preis für ' + $scope.data.propName + ' wurde von ' +
                            $scope.data.currentPrice.formatPrice('€') + ' auf ' +
                            $scope.data.details.newPrice.formatPrice('€') + ' abgeändert');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelPriceChange());
            }

        }
    }
    return dialog;
});

zmwModule.directive('bidHistoryDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/bid-history.html',
        controller: function ($scope, BidHistoryService, RevealService) {

            var dialogId = 'reveal-bid-history';

            // wire this directive with the public access Dialogs components
            // TODO is it correct, that the whole logic is inside this function? For every call everything will be performed again - for instance the bidHistoryLogic holds every call the same content
            Dialogs.bidHistory = function(data) {
                $scope.data = {
                    propType          : data.propType,            // knows the current prop type
                    propId            : data.propId,              // knows the current propId of the property
                    ownerId           : data.ownerId,             // the owner id of the property
                    userId            : data.userId               // the current user id
                }

                RevealService.show(dialogId);
                RevealService.forceShow(dialogId);

                var promise = BidHistoryService.getBidHistories($scope.data.propType, $scope.data.propId,
                                  $scope.data.ownerId, $scope.data.userId);
                promise.then(function(data) {
                    $scope.items = data;
                });
            }

            $scope.bidHistoryLogic = function(scope) {
                var historyFinals = Zmw.finals.history.actions;

                scope.isOwner = function(item) {
                    if (item.action === historyFinals.BID_REQUEST_HOT_DEAL) return false;
                    else if (item.action === historyFinals.HOT_DEAL_RETIRED) return false;
                    else if (item.action === historyFinals.OWNER_BID_REQUEST) return true;
                    else if (item.action === historyFinals.BID_REQUEST) return false;
                    else if (item.action === historyFinals.BID_REQUEST_RETIRED &&
                        item.ancestor.action === historyFinals.BID_REQUEST) return false;
                    else if (item.action === historyFinals.BID_REQUEST_RETIRED &&
                        item.ancestor.action === historyFinals.OWNER_BID_REQUEST) return true;
                    else if (item.action === historyFinals.BID_ACCEPT_RESPONSE &&
                        item.ancestor.action === historyFinals.OWNER_BID_REQUEST) return false;
                    else if (item.action === historyFinals.BID_ACCEPT_RESPONSE &&
                        item.ancestor.action === historyFinals.BID_REQUEST) return false;
                    else if (item.action === historyFinals.BID_DECLINE_RESPONSE &&
                        item.ancestor.action === historyFinals.BID_REQUEST) return true;
                    else if (item.action === historyFinals.BID_DECLINE_RESPONSE &&
                        item.ancestor.action === historyFinals.OWNER_BID_REQUEST) return false;
                    return true;
                }

                scope.isNotOwner = function(item) {
                    return !scope.isOwner(item);
                }

                scope.aBidRequest = function(action) {
                    return (action === historyFinals.BID_REQUEST ||
                        action === historyFinals.OWNER_BID_REQUEST);
                }
                scope.aHotDeal = function(action) {
                    return action === historyFinals.BID_REQUEST_HOT_DEAL;
                }
                scope.aBidDecline = function(action) {
                    return action === historyFinals.BID_DECLINE_RESPONSE;
                }
                scope.aBidAccept = function(action) {
                    return action === historyFinals.BID_ACCEPT_RESPONSE;
                }
                scope.aBidRetired = function(action) {
                    return action === historyFinals.BID_REQUEST_RETIRED;
                }
                scope.aHotDealRetired = function(action) {
                    return action === historyFinals.HOT_DEAL_RETIRED;
                }

            }

            $scope.cancelBidHistory = function() { RevealService.hide(dialogId); }
        }
    }
    return dialog;
});

zmwModule.directive('ownerBidRequestDialog', function () {
    var dialog = {
        restrict: 'E',
        replace: false,
        templateUrl: '/static/dialogs/owner-bid-request.html',
        controller: function ($scope, TradingRestAPI, RevealService) {

            var dialogId = 'reveal-owner-bid-request';

            // TODO remove dump
            console.log("pending bid request status ", $scope.pendingBidRequestStatus);

            /**
             * will be synchronized during the dialog open / selection / deselection procedures
             * @type {string}
             */
            $scope.recipientName = '';

            // wire this directive with the public access Dialogs components
            Dialogs.ownerBidRequest = function(data) {

                /**
                 * lazy loading mechanism. If this is the first dialogs call, load all following users for given property
                 *
                 * ** ATTENTION **
                 *
                 * in this case it is okay, that it can be accepted, that here the propId, propType will never change
                 * without having a page request. The reason is, that this dialog is only available at the view page
                 * for the owner of the property!
                 *
                 * So further checkups are not needed.
                 */

                if ($scope.followerDetails === undefined) {

                    var getData = {
                        propId : data.propId,
                        propType: data.propType
                    }

                    // TODO remove dump
                    console.log('start to load all follower details with getData = ', getData);

                    TradingRestAPI.followerDetails(getData).$promise.
                        then(function(details) {
                            // TODO remove dump
                            console.log('load all follower details = ', details)
                            $scope.followerDetails = details;
                        }).
                        catch(MessageAPICommonCatch)

                } else {
                    /**
                     * ** ATTENTION **
                     *
                     * if followers are already loaded, filter out all isFollowing == false entries. Why here and not just in
                     * time:
                     * If the owner has opened the dialog and during that time a user is not longer following, the entry
                     * simply will be deactivated
                     */
                    var cleanUpdFollowerDetails = [];
                    for (var i = 0, length = $scope.followerDetails.length; i < length; i++) {
                        var detail = $scope.followerDetails[i];
                        if (detail.isFollowing === true) {
                            detail.isSelected = false;
                            cleanUpdFollowerDetails.push(detail);
                        }
                    }

                    $scope.followerDetails = cleanUpdFollowerDetails;

                }

                // if the dialog is opened, per default no recipient is selected
                $scope.bidRequestForm.$setValidity("noRecipientSelected", false);

                // TODO remove dump - wait a second because async call the first time!
                window.setTimeout(function() { console.log("FOLLOWER DETAILS :: ", $scope.followerDetails) }, 1000);

                // TODO it is possible, that the owner will change the price from another device, then it is needed to update the price in this dialog! ( price-updater component )

                $scope.data = {
                    currentPrice      : data.currentPrice,         // knows the current price of the property
                    propType          : data.propType,             // the property type - important for the server side
                    propId            : data.propId,               // the according property id - important for the server side
                    ownerId           : data.ownerId,              // knows the owner id
                    recipient         : null,                      // if the owner has select a user, the complete item with all information will be set here
                    details           : {                          // will set as a param during the rest call --> see inner case class Details in bearBidRequest method
                        price             : null,                  // the user's bid-request price
                        comment           : '',                    // an additional comment by the user - if no comment is given, set it as undefined during the rest call!
                        recipientId       : null                   // this is the id of the recipient ( selected user )
                    }
                }

                /**
                 * set flag to true to know, that this dialog on this device is opened
                 */
                $scope.isOpened = true;

                syncRecipientName();

                RevealService.show(dialogId);
                RevealService.forceShow(dialogId);

            }

            /**
             * is used to provide the logic for the wipe-box
             * @param scope of the wipe-box directive
             */
            $scope.followerLogic = function(scope) {

                /**
                 * are needed for the markup checkup's ( in the wipe-box logic !! )
                 */
                scope.pendingBidRequestStatus = Zmw.finals.tradingBoard.pendingBidRequestStatus;


                /**
                 * Identify the selected user and set it as the recipient for the owner bid request
                 *
                 */
                scope.select = function(item) {
                    // check, if to this time already the recipient is set.
                    if ($scope.data.recipient != null) scope.deselect($scope.data.recipient);

                    // set the flag to given item. It is needed for the dynamic ui button change
                    item.isSelected = true;

                    // set given item as the recipient user
                    $scope.data.recipient = item;
                    $scope.data.details.recipientId = item.userId;

                    $scope.bidRequestForm.$setValidity("noRecipientSelected", true);

                    syncRecipientName();
                }

                /**
                 * Deselected given user and remove it as the recipient for the owner bid request
                 *
                 */
                scope.deselect = function(item) {
                    // simply remove the recipient to complete deselection
                    $scope.data.recipient = null;
                    $scope.data.details.recipientId = null;

                    item.isSelected = undefined;

                    $scope.bidRequestForm.$setValidity("noRecipientSelected", false);

                    syncRecipientName();
                }

            }

            function syncRecipientName() {
                if ($scope.isOpened === true && $scope.data.recipient != null) $scope.recipientName = $scope.data.recipient.userName;
                else $scope.recipientName = 'einen Interessenten';
            }

            $scope.cancelOwnerBidRequest = function() {
                RevealService.hide(dialogId);
                $scope.isOpened = false;
            }

            $scope.showBidHistory = function() {
                Dialogs.bidHistory({
                    propType    : $scope.data.propType,
                    propId      : $scope.data.propId,
                    ownerId     : $scope.data.ownerId,
                    userId      : $scope.data.details.recipientId
                });
            }

            $scope.showBidHistoryPossible = function() {
                return $scope.data !== undefined && $scope.data.recipient != null;
            }

            $scope.ownerBidRequest = function() {
                var postData = {
                    propType    : $scope.data.propType,
                    propId      : $scope.data.propId,
                    details     : $scope.data.details
                }

                TradingRestAPI.bearOwnerBidRequest(postData).$promise.
                    then(function() {
                        MessageAPI.info('Ihr Angebot wird an ' + $scope.data.recipient.userName + ' versendet');
                    }).
                    catch(MessageAPICommonCatch).
                    finally($scope.cancelOwnerBidRequest());
            }

        }
    }
    return dialog;
});

