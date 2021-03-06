import { Reducer } from 'redux';
import { AppThunkAction } from './appThunkAction';
import * as shortid from 'shortid';
import { RuleManager, CardList, cardOperations } from 'pmpos-modules';
import { List, Record } from 'immutable';
import { ActionsObservable } from 'redux-observable';
import { Observable } from 'rxjs/Observable';
import { ApplicationState } from '.';
import {
    CardRecord, CardTypeRecord, CommitRecord, ActionRecord, Commit, ActionState,
    CardTag
} from 'pmpos-models';
import OperationEditor from '../modules/OperationEditor';

export interface State {
    cards: List<CardRecord>;
    currentCard: CardRecord;
    currentCardType: CardTypeRecord;
    currentCommits: List<CommitRecord> | undefined;
    pendingActions: List<ActionRecord>;
    isLoaded: boolean;
    protocol: any;
    cardListScrollTop: number;
    searchValue: string;
    showAllCards: boolean;
    failed: boolean;
    tabIndex: number;
}

export class StateRecord extends Record<State>({
    currentCard: new CardRecord(),
    currentCardType: new CardTypeRecord(),
    pendingActions: List<ActionRecord>(),
    currentCommits: List<CommitRecord>(),
    cards: List<CardRecord>(),
    isLoaded: false,
    protocol: undefined,
    cardListScrollTop: 0,
    searchValue: '',
    showAllCards: false,
    failed: false,
    tabIndex: 0
}) { }

type SetCommitProtocolAction = {
    type: 'SET_COMMIT_PROTOCOL'
    protocol: any
};

type CommitReceivedAction = {
    type: 'COMMIT_RECEIVED'
    values: Commit[]
};

type CommitReceivedSuccessAction = {
    type: 'COMMIT_RECEIVED_SUCCESS'
};

type CommitCardAction = {
    type: 'COMMIT_CARD'
};

type AddPendingActionAction = {
    type: 'ADD_PENDING_ACTION'
    action: ActionRecord,
    initialize: boolean
};

type RemovePendingActionsAction = {
    type: 'REMOVE_PENDING_ACTIONS'
    cardId: string
};

type LoadCardAction = {
    type: 'LOAD_CARD'
    cardId: String
    payload: Promise<CardRecord>
};

type LoadCardRequestAction = {
    type: 'LOAD_CARD_REQUEST'
};

type LoadCardSuccessAction = {
    type: 'LOAD_CARD_SUCCESS'
    payload: CardRecord
};

type LoadCardFailAction = {
    type: 'LOAD_CARD_FAIL'
};

type SetCurrentCardTypeAction = {
    type: 'SET_CURRENT_CARD_TYPE'
    cardType: CardTypeRecord
};

type SetCardListScrollTopAction = {
    type: 'SET_CARD_LIST_SCROLL_TOP'
    value: number
};

type SetSearchValueAction = {
    type: 'SET_SEARCH_VALUE',
    value: string
};

type SetShowAllCardsAction = {
    type: 'SET_SHOW_ALL_CARDS',
    value: boolean
};

type SetTabIndexAction = {
    type: 'SET_TAB_INDEX',
    value: number
};

type KnownActions = AddPendingActionAction | CommitCardAction | CommitReceivedAction | CommitReceivedSuccessAction
    | LoadCardAction | LoadCardRequestAction | LoadCardSuccessAction | LoadCardFailAction
    | SetCommitProtocolAction | SetCurrentCardTypeAction | SetCardListScrollTopAction |
    SetSearchValueAction | SetShowAllCardsAction | RemovePendingActionsAction | SetTabIndexAction;

function getEditor(card: CardRecord, action: ActionRecord, observer: any): Promise<ActionRecord> {
    return new Promise<ActionRecord>((resolve, reject) => {
        let editor = OperationEditor.getEditor(
            action.actionType,
            card,
            (actionType, data) => {
                observer.next({ type: 'SET_MODAL_STATE', visible: false });
                let result = action.set('data', data);
                resolve(result);
            },
            () => {
                observer.next({ type: 'SET_MODAL_STATE', visible: false });
                reject();
            },
            action.data);
        observer.next({ type: 'SET_MODAL_COMPONENT', component: editor });
    });
}

async function getResult(actionState: ActionState, action: ActionRecord, observer: any) {
    action = action.set('data', cardOperations.fixData(action.actionType, { ...action.data }));
    if (cardOperations.canEdit(action)) {
        let result = await getEditor(actionState.card, action, observer);
        return { type: 'ADD_PENDING_ACTION', action: result, initialize: false };
    } else { return { type: 'ADD_PENDING_ACTION', action, initialize: false }; }
}

async function createObserver(actionState: ActionState, actions: ActionRecord[], observer: any) {
    for (const action of actions) {
        let result = await getResult(actionState, action, observer);
        observer.next(result);
    }
}

export const epic = (
    action$: ActionsObservable<AddPendingActionAction>,
    store: { getState: Function, dispatch: Function }): Observable<AddPendingActionAction> =>
    action$.ofType('ADD_PENDING_ACTION')
        .mergeMap(async action => {
            let root = store.getState().cards.currentCard as CardRecord;
            let cardId = action.action.actionType === 'CREATE_CARD'
                ? action.action.data.id : action.action.cardId;
            let card = root.getCard(cardId) || root;
            let actions = await RuleManager.getNextActions(
                action.action.actionType,
                action.action.data,
                action.action.cardId,
                root, card);
            return Observable.create(observer =>
                createObserver({ root, card, action: action.action }, actions, observer)
                    .then(() => observer.complete())
                    .catch(() => observer.complete()));
        })
        .mergeMap(x => x);

export const reducer: Reducer<StateRecord> = (
    state: StateRecord = new StateRecord(),
    action: KnownActions
) => {
    switch (action.type) {
        case 'ADD_PENDING_ACTION': {
            let currentState = action.initialize
                ? state
                    .set('currentCard', new CardRecord())
                    .set('isLoaded', true)
                    .set('currentCommits', undefined)
                    .set('pendingActions', state.pendingActions.clear())
                : state;
            return currentState
                .update('currentCard', current => CardList.applyAction(current, action.action))
                .update('pendingActions', list => list.push(action.action));
        }
        case 'REMOVE_PENDING_ACTIONS': {
            let actions = state.pendingActions;
            actions = actions.filter(a => !a.relatesToCard(action.cardId));
            if (actions.count() !== state.pendingActions.count()) {
                let card = CardList.getCard(state.currentCard.id);
                card = actions.reduce((r, a) => CardList.applyAction(r, a, false), card);
                return state
                    .set('currentCard', card)
                    .set('pendingActions', actions);
            }
            return state;
        }
        case 'SET_COMMIT_PROTOCOL': {
            return state.set('protocol', action.protocol);
        }
        case 'COMMIT_RECEIVED': {
            CardList.addCommits(action.values);
            return state.set('cards', CardList.getCardsByType(state.currentCardType.id));
        }
        case 'COMMIT_RECEIVED_SUCCESS': {
            return state.set('cards', CardList.getCardsByType(state.currentCardType.id));
        }
        case 'COMMIT_CARD': {
            return resetCurrentCard(state);
        }
        case 'LOAD_CARD_REQUEST': {
            return resetCurrentCard(state);
        }
        case 'LOAD_CARD_SUCCESS': {
            let result = state
                .set('currentCard', action.payload)
                .set('currentCommits', CardList.getCommits(action.payload.id))
                .set('isLoaded', true);
            return result;
        }
        case 'LOAD_CARD_FAIL': {
            return state
                .set('isLoaded', false)
                .set('failed', true);
        }
        case 'SET_CURRENT_CARD_TYPE': {
            return state
                .set('cards', CardList.getCardsByType(action.cardType.id))
                .set('currentCardType', action.cardType)
                .set('tabIndex', 0);
        }
        case 'SET_CARD_LIST_SCROLL_TOP': {
            return state.set('cardListScrollTop', action.value);
        }
        case 'SET_SEARCH_VALUE': {
            return state.set('searchValue', action.value);
        }
        case 'SET_SHOW_ALL_CARDS': {
            return state
                .set('showAllCards', action.value)
                .set('cardListScrollTop', 0);
        }
        case 'SET_TAB_INDEX': {
            return state.set('tabIndex', action.value);
        }
        default:
            return state;
    }
};

function resetCurrentCard(state: StateRecord) {
    return state
        .set('currentCard', new CardRecord())
        .set('pendingActions', state.pendingActions.clear())
        .set('currentCommits', undefined)
        .set('isLoaded', false)
        .set('failed', false);
}

function createAndPostCommit(state: ApplicationState, card: CardRecord, actions: List<ActionRecord>) {
    let commit = {
        id: shortid.generate(),
        time: new Date().getTime(),
        terminalId: state.client.terminalId,
        user: state.client.loggedInUser,
        cardId: card.id,
        state: card.toJS(),
        actions: actions.toJS()
    };
    state.cards.protocol.push([commit]);
}

export const actionCreators = {
    addCard: (cardType: CardTypeRecord, tags: CardTag[])
        : AppThunkAction<KnownActions> => (dispatch, getState) => {
            let cardId = shortid.generate();
            let cardCreateAction = new ActionRecord({
                actionType: 'CREATE_CARD',
                id: shortid.generate(),
                data: {
                    id: cardId,
                    typeId: cardType.id,
                    type: cardType.name,
                    time: new Date().getTime()
                }
            });
            dispatch({
                type: 'ADD_PENDING_ACTION',
                action: cardCreateAction,
                initialize: true
            });
            tags.forEach((tag: CardTag) => {
                let actionData = new ActionRecord({
                    id: shortid.generate(),
                    cardId: cardId,
                    actionType: 'SET_CARD_TAG',
                    data: { name: tag.name, value: tag.value, typeId: tag.typeId }
                });
                dispatch({
                    type: 'ADD_PENDING_ACTION', action: actionData, initialize: false
                });
            });
        },
    addPendingAction: (card: CardRecord | undefined, actionType: string, data: any):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            let c = card || getState().cards.currentCard;
            let actionData = new ActionRecord({
                id: shortid.generate(),
                cardId: c.id,
                actionType,
                data,
                concurrencyData: CardList.readConcurrencyData(actionType, c, data)
            });
            if (CardList.canApplyAction(c, actionData)) {
                dispatch({
                    type: 'ADD_PENDING_ACTION', action: actionData, initialize: false
                });
            }
        },
    removePendingActions: (cardId: string):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            if (cardId) { dispatch({ type: 'REMOVE_PENDING_ACTIONS', cardId }); }
        },
    postCommits: (commits: any[]):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            commits = commits.map(x => {
                x.terminalId = getState().client.terminalId;
                x.user = getState().client.loggedInUser;
                return x;
            });
            getState().cards.protocol.push(commits);
        },
    postCommit: (card: CardRecord, actions: List<ActionRecord>):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            createAndPostCommit(getState(), card, actions);
        },
    commitCard: (): AppThunkAction<KnownActions> => (dispatch, getState) => {
        const state = getState().cards;
        RuleManager.getNextActions('COMMIT_CARD', {}, state.currentCard.id, state.currentCard, state.currentCard)
            .then(commitActions => {
                let pendingActions = state.pendingActions.concat(commitActions);
                if (pendingActions.count() > 0) {
                    let processedActions = pendingActions
                        .map(a => cardOperations.processPendingAction(a));
                    createAndPostCommit(getState(), state.currentCard, processedActions);
                }
                dispatch({
                    type: 'COMMIT_CARD'
                });
            });
    },

    deleteCards: (cardTypeId: string): AppThunkAction<KnownActions> => (dispatch, getState) => {
        let cards = CardList.getCardsByType(cardTypeId);
        let state = getState().cards;
        for (let index = state.protocol.length - 1; index >= 0; index--) {
            const element = state.protocol.get(index);
            let card = cards.find(c => c.id === element.cardId);
            if (card) {
                state.protocol.delete(index);
                CardList.cards = CardList.cards.remove(card.id);
            }
        }
    },
    loadCard: (id: string): AppThunkAction<KnownActions> => (dispatch, getState) => {
        dispatch({
            type: 'LOAD_CARD',
            cardId: id,
            payload: new Promise<CardRecord>((resolve, reject) => {
                let card = CardList.getCard(id);
                if (!card) {
                    reject(`${id} not found`);
                } else {
                    resolve(card);
                }
            })
        });
    },
    setCurrentCardType: (cardType: CardTypeRecord | undefined):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            if (cardType) {
                dispatch({
                    type: 'SET_CURRENT_CARD_TYPE',
                    cardType
                });
            }
        },
    setCardListScrollTop: (value: number):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            dispatch({ type: 'SET_CARD_LIST_SCROLL_TOP', value });
        },
    setSearchValue: (value: string):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            dispatch({ type: 'SET_SEARCH_VALUE', value });
        },
    setShowAllCards: (value: boolean):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            dispatch({ type: 'SET_SHOW_ALL_CARDS', value });
        },
    setTabIndex: (value: number):
        AppThunkAction<KnownActions> => (dispatch, getState) => {
            dispatch({ type: 'SET_TAB_INDEX', value });
        }
};