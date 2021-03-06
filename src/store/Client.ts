import { Reducer } from 'redux';
import * as React from 'react';

export interface ClientState {
    languageName: string;
    drawerOpen: boolean;
    loggedInUser: string;
    terminalId: string;
    networkName: string;
    modalComponent: JSX.Element;
    modalOpen: boolean;
}

interface ToggleDrawerAction {
    type: 'TOGGLE_DRAWER';
    forceClose: boolean;
}

interface SetLoggedInUserAction {
    type: 'SET_LOGGEDIN_USER';
    user: string;
}

interface SetTerminalIdAction {
    type: 'SET_TERMINAL_ID';
    terminalId: string;
    networkName: string;
}

interface SetModalStateAction {
    type: 'SET_MODAL_STATE';
    visible: boolean;
}

interface SetModalComponentAction {
    type: 'SET_MODAL_COMPONENT';
    component: any;
}

type KnownAction = ToggleDrawerAction | SetModalStateAction | SetModalComponentAction
    | SetLoggedInUserAction | SetTerminalIdAction;

export const actionCreators = {
    SetLoggedInUser: (user: string) => <SetLoggedInUserAction>{ type: 'SET_LOGGEDIN_USER', user },
    SetTerminalId: (terminalId: string, networkName: string) => <SetTerminalIdAction>{
        type: 'SET_TERMINAL_ID', terminalId, networkName
    },
    ToggleDrawer: (forceClose?: boolean) => <ToggleDrawerAction>{ type: 'TOGGLE_DRAWER', forceClose },
    SetModalState: (visible: boolean) => <SetModalStateAction>{ type: 'SET_MODAL_STATE', visible },
    SetModalComponent: (component: any) => <SetModalComponentAction>{ type: 'SET_MODAL_COMPONENT', component }
};

const unloadedState: ClientState = {
    languageName: 'aa',
    drawerOpen: false,
    loggedInUser: '',
    terminalId: '',
    networkName: '',
    modalComponent: React.createElement('div'),
    modalOpen: false
};

export const reducer: Reducer<ClientState> = (state: ClientState, action: KnownAction) => {
    switch (action.type) {
        case 'TOGGLE_DRAWER':
            return { ...state, drawerOpen: !action.forceClose && !state.drawerOpen };
        case 'SET_LOGGEDIN_USER':
            return { ...state, loggedInUser: action.user };
        case 'SET_TERMINAL_ID':
            localStorage.setItem('terminalId', action.terminalId);
            localStorage.setItem('networkName', action.networkName);
            return { ...state, terminalId: action.terminalId, networkName: action.networkName };
        case 'SET_MODAL_STATE':
            return { ...state, modalOpen: action.visible };
        case 'SET_MODAL_COMPONENT':
            return { ...state, modalComponent: action.component, modalOpen: true };
        default: return state || unloadedState;
    }
};
