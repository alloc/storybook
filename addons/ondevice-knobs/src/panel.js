import React from 'react';
import { View, Text, Button } from 'react-native';
import PropTypes from 'prop-types';
import { SELECT_STORY, FORCE_RE_RENDER } from '@storybook/core-events';
import { SET, SET_OPTIONS, RESET, CHANGE, CLICK } from '@storybook/addon-knobs';
import GroupTabs from './GroupTabs';
import PropForm from './PropForm';

const getTimestamp = () => +new Date();

const DEFAULT_GROUP_ID = 'Other';

export default class Panel extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.setKnobs = this.setKnobs.bind(this);
    this.reset = this.reset.bind(this);
    this.setOptions = this.setOptions.bind(this);
    this.onGroupSelect = this.onGroupSelect.bind(this);

    this.state = { knobs: {}, groupId: DEFAULT_GROUP_ID };
    this.options = {};

    this.lastEdit = getTimestamp();
    this.loadedFromUrl = false;
  }

  componentDidMount() {
    const { channel } = this.props;

    channel.on(SET, this.setKnobs);
    channel.on(SET_OPTIONS, this.setOptions);
    channel.on(SELECT_STORY, this.reset);
    channel.emit(FORCE_RE_RENDER);
  }

  componentWillUnmount() {
    const { channel } = this.props;
    channel.removeListener(SET, this.setKnobs);
    channel.removeListener(SELECT_STORY, this.reset);
  }

  onGroupSelect(name) {
    this.setState({ groupId: name });
  }

  setOptions(options = { timestamps: false }) {
    this.options = options;
  }

  setKnobs({ knobs, timestamp }) {
    if (!this.options.timestamps || !timestamp || this.lastEdit <= timestamp) {
      this.setState({ knobs });
    }
  }

  reset = () => {
    const { channel } = this.props;
    this.setState({ knobs: {} });
    channel.emit(RESET);
  };

  emitChange(changedKnob) {
    const { channel } = this.props;
    channel.emit(CHANGE, changedKnob);
  }

  handleChange(changedKnob) {
    this.lastEdit = getTimestamp();
    const { knobs } = this.state;
    const { name } = changedKnob;
    const newKnobs = { ...knobs };
    newKnobs[name] = {
      ...newKnobs[name],
      ...changedKnob,
    };

    this.setState({ knobs: newKnobs });

    this.setState(
      { knobs: newKnobs },
      this.emitChange(
        changedKnob.type === 'number'
          ? { ...changedKnob, value: parseFloat(changedKnob.value) }
          : changedKnob
      )
    );
  }

  handleClick(knob) {
    const { channel } = this.props;

    channel.emit(CLICK, knob);
  }

  render() {
    const { active } = this.props;

    if (!active) {
      return null;
    }

    const { knobs, groupId } = this.state;

    const groups = {};
    const groupIds = [];

    let knobsArray = Object.keys(knobs);

    knobsArray
      .filter(key => knobs[key].groupId)
      .forEach(key => {
        const knobKeyGroupId = knobs[key].groupId;
        groupIds.push(knobKeyGroupId);
        groups[knobKeyGroupId] = {
          render: () => <Text id={knobKeyGroupId}>{knobKeyGroupId}</Text>,
          title: knobKeyGroupId,
        };
      });

    if (groupIds.length > 0) {
      groups[DEFAULT_GROUP_ID] = {
        render: () => <Text id={DEFAULT_GROUP_ID}>{DEFAULT_GROUP_ID}</Text>,
        title: DEFAULT_GROUP_ID,
      };

      if (groupId === DEFAULT_GROUP_ID) {
        knobsArray = knobsArray.filter(key => !knobs[key].groupId);
      }

      if (groupId !== DEFAULT_GROUP_ID) {
        knobsArray = knobsArray.filter(key => knobs[key].groupId === groupId);
      }
    }

    knobsArray = knobsArray.map(key => knobs[key]);

    const wrapKnobs = children => <View style={{ flex: 1, padding: 10 }}>{children}</View>;

    if (knobsArray.length === 0) {
      return wrapKnobs(<Text>NO KNOBS</Text>);
    }

    return wrapKnobs(
      <>
        {groupIds.length > 0 && (
          <GroupTabs groups={groups} onGroupSelect={this.onGroupSelect} selectedGroup={groupId} />
        )}
        <View>
          <PropForm
            knobs={knobsArray}
            onFieldChange={this.handleChange}
            onFieldClick={this.handleClick}
          />
        </View>
        <View style={{ margin: 10 }}>
          <Button onPress={this.reset} title="RESET" />
        </View>
      </>
    );
  }
}

Panel.propTypes = {
  active: PropTypes.bool.isRequired,
  channel: PropTypes.shape({
    emit: PropTypes.func,
    on: PropTypes.func,
    removeListener: PropTypes.func,
  }).isRequired,
  onReset: PropTypes.object, // eslint-disable-line
};
