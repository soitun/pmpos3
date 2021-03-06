import * as React from 'react';
import { connect } from 'react-redux';
import * as ConfigStore from '../../store/Config';
import { RouteComponentProps } from 'react-router';
import { WithStyles, List, ListItem, Paper } from 'material-ui';
import decorate, { Style } from './style';
import { ApplicationState } from '../../store/index';
import { Map as IMap } from 'immutable';
import TopBar from '../TopBar';
import Divider from 'material-ui/Divider/Divider';
import ListItemText from 'material-ui/List/ListItemText';
import { CardTypeRecord } from 'pmpos-models';

type PageProps =
    { cardTypes: IMap<string, CardTypeRecord> }
    & WithStyles<keyof Style>
    & typeof ConfigStore.actionCreators
    & RouteComponentProps<{}>;

class CardTypesPage extends React.Component<PageProps, {}> {

    getSecondaryCommands() {
        let result = [
            {
                icon: 'add', onClick: () => {
                    this.props.history.push(process.env.PUBLIC_URL + '/cardType');
                    this.props.addCardType();
                }
            }
        ];
        return result;
    }

    renderCards(cardTypes: CardTypeRecord[]) {
        return cardTypes.map(cardType => {
            return cardType && (
                <div key={cardType.id}>
                    <ListItem
                        button
                        onClick={(e) => {
                            this.props.history.push(process.env.PUBLIC_URL + '/cardType');
                            this.props.loadCardType(cardType.id);
                            e.preventDefault();
                        }}
                    >
                        <ListItemText
                            primary={cardType.name}
                            secondary={cardType.id}
                        />
                    </ListItem>
                    <Divider />
                </div>
            );
        });
    }

    public render() {
        return (
            <div className={this.props.classes.root}>
                <TopBar
                    title="Card Types"
                    secondaryCommands={this.getSecondaryCommands()}
                />

                <Paper className={this.props.classes.content}>
                    <List>
                        {this.renderCards(this.props.cardTypes.valueSeq()
                            .sort((x, y) => x.name > y.name ? 1 : -1)
                            .toArray())}
                    </List>
                </Paper>
            </div>
        );
    }
}

const mapStateToProps = (state: ApplicationState) => ({
    cardTypes: state.config.cardTypes,
});

export default decorate(connect(
    mapStateToProps,
    ConfigStore.actionCreators
)(CardTypesPage));