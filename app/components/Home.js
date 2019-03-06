import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import Select from 'react-select';
import Fab from '@material-ui/core/Fab';
import { TextField } from '@material-ui/core';
import styles from './Home.css';

const objectOptions = [
  { value: 'Set 1', label: 'Set 1' },
  { value: 'Set 2', label: 'Set 2' },
  { value: 'Familiarization', label: 'Familiarization' }
];

const vocodedOptions = [
  { value: 'VS', label: 'Vocoded' },
  { value: 'NVS', label: 'NonVocoded' }
];

const videoOptions = [
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio Only' }
];

const transcriptionOptions = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' }
];

const style = {
  selectText: {
    color: 'white'
  },
  textField: {
    background: 'white'
  }
};
class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pid: '',
      object: null,
      vocoded: null,
      video: null,
      transcription: null,
      formFilled: false
    };
  }

  stateChange = () => {
    const { pid, object, vocoded, video, transcription } = this.state;

    if (
      pid !== '' &&
      object !== null &&
      vocoded !== null &&
      video !== null &&
      transcription !== null
    )
      return this.setState({ formFilled: true });

    return this.setState({ formFilled: false });
  };

  handleSelect = key => value =>
    this.setState({ [key]: value }, this.stateChange);

  render() {
    const {
      pid,
      video,
      object,
      vocoded,
      transcription,
      formFilled
    } = this.state;
    return (
      <div className={styles.container} data-tid="container">
        <TextField
          variant="filled"
          style={style.textField}
          label="Participant ID"
          value={pid}
          onChange={e =>
            this.setState({ pid: e.target.value }, this.stateChange)
          }
        />
        <br />
        <br />
        <span style={style.selectText}>Set of objects for this trial:</span>
        <br />
        <br />
        <Select
          options={objectOptions}
          value={object}
          onChange={this.handleSelect('object')}
        />
        <br />
        <span style={style.selectText}>Vocoded or NonVocoded:</span>
        <br />
        <br />
        <Select
          options={vocodedOptions}
          value={vocoded}
          onChange={this.handleSelect('vocoded')}
        />
        <br />
        <span style={style.selectText}>Video or Audio Only:</span>
        <br />
        <br />
        <Select
          options={videoOptions}
          value={video}
          onChange={this.handleSelect('video')}
        />
        <br />
        <span style={style.selectText}>Subtitles:</span>
        <br />
        <br />
        <Select
          options={transcriptionOptions}
          value={transcription}
          onChange={this.handleSelect('transcription')}
        />
        <br />
        <Fab
          variant="extended"
          aria-label="Start"
          color="primary"
          disabled={!formFilled}
          component={Link}
          to={{
            pathname: '/trial',
            state: { ...this.state }
          }}
        >
          Start Trial
        </Fab>
      </div>
    );
  }
}

export default withRouter(Home);
