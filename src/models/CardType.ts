import { Record } from 'immutable';

export interface CardType {
    id: string;
    name: string;
    reference: string;
    cardDisplayFormat: string;
    listDisplayFormat: string;
    commands: string[];
}

export class CardTypeRecord extends Record<CardType>({
    id: '',
    name: '',
    reference: '',
    cardDisplayFormat: '',
    listDisplayFormat: '',
    commands: []
}) { }