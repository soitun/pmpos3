import * as React from 'react';
import { connect } from 'react-redux';
import { ApplicationState } from '../../store';
import * as BlocksStore from '../../store/Blocks';
import { uuidv4 } from '../../store/uuid';
import { WithStyles, Input, IconButton, Select, MenuItem } from 'material-ui';
import { RouteComponentProps } from 'react-router';
import decorate, { Style } from './style';
import TopBar from '../TopBar';
import { Map as IMap, List as IList } from 'immutable';
import Paper from 'material-ui/Paper/Paper';
import Divider from 'material-ui/Divider/Divider';
import Y from 'yjs/dist/y';
import BlockList from './BlockList';

export type PageProps =
    {
        blocks: IMap<string, IList<any>>,
        protocol: any
    }
    & WithStyles<keyof Style>
    & typeof BlocksStore.actionCreators
    & RouteComponentProps<{}>;

class BlocksPage extends React.Component<PageProps, { type: string, data: string, bid: string }> {
    constructor(props: PageProps) {
        super(props);
        this.state = { type: '', data: '', bid: '' };
    }

    public handleNewBlock() {
        console.log('blocks', this.props.protocol.share.actionLog);
        let actionLog = this.props.protocol.share.actionLog;
        let bid = this.state.type === 'CREATE_BLOCK' ? uuidv4() : this.state.bid;
        let actions = actionLog.get(bid);
        console.log('log', actions);
        if (!actions) {
            actionLog.set(bid, Y.Array);
        } else {
            actions.push([{
                bid,
                type: this.state.type,
                data: this.objectify(this.state.data)
            }]);
        }
        this.setState({ type: '', data: '' });
    }

    objectify(data: string) {
        let result = {};
        this.state.data.split(',').map(x => {
            let parts = x.split(':');
            result[parts[0]] = parts[1];
            return result;
        });
        return JSON.stringify(result);
    }
    public render() {
        return (
            <Paper className={this.props.classes.root}>
                <TopBar title="Blocks" />
                <div className={this.props.classes.content}>
                    <BlockList
                        blocks={this.props.blocks}
                        onClick={bid => this.setState({ bid })}
                        selectedBid={this.state.bid}
                    />
                </div>
                <Divider />
                <div className={this.props.classes.footer}>
                    <Select
                        className={this.props.classes.footerSelect}
                        disableUnderline
                        value={this.state.type}
                        onChange={(e) => this.setState({ type: e.target.value })}
                        input={<Input placeholder="Select action type" />}
                    >
                        <MenuItem value="CREATE_BLOCK">Create Block</MenuItem>
                        <MenuItem value="SET_BLOCK_TAG">Tag Block</MenuItem>
                    </Select>
                    <Divider />
                    <Input
                        className={this.props.classes.footerInput}
                        placeholder="Type action data"
                        value={this.state.data}
                        disableUnderline
                        onKeyDown={e => {
                            if (this.state.type && e.key === 'Enter') {
                                e.preventDefault();
                                this.handleNewBlock();
                            }
                        }}
                        onChange={(e) => this.setState({ data: e.target.value })}
                        endAdornment={
                            <IconButton onClick={() => this.handleNewBlock()}>
                                <i className="material-icons">send</i>
                            </IconButton>}
                    />
                </div>
            </Paper>
        );
    }
}

const mapStateToProps = (state: ApplicationState) => ({
    blocks: state.blocks.get('log'),
    protocol: state.blocks.get('protocol')
});

export default decorate(connect(
    mapStateToProps,
    BlocksStore.actionCreators
)(BlocksPage));