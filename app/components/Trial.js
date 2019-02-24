import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import { Player } from 'video-react';
import Image from 'react-bootstrap/Image';
import Fab from '@material-ui/core/Fab';
import routes from '../constants/routes';
import styles from './Trial.css';
import { videos } from '../videos';
import { images } from '../images';
import { keys } from '../keys';

const { dialog } = require('electron').remote;

const videoWidth = 500;
const videoHeight = 500;

class Trial extends Component {
  constructor(props) {
    super(props);
    const {
      location: {
        state: {
          pid,
          object: { value: object },
          video: { value: video },
          vocoded: { value: vocoded }
        }
      }
    } = this.props;

    this.state = {
      pid,
      object,
      video,
      vocoded,
      trialNumber: 0,
      trial: this.generateTrial(object, vocoded),
      guess: 0,
      tempTrialData: {},
      selected: [],
      trialData: [],
      lock: false,
      errorMsg: '',
      showRedBorder: '',
      showGreenBorder: ''
    };
  }

  generateTrial = (object, vocoded) => {
    const trial = [];
    const trialKeys = this.shuffle(Object.keys(keys[object]));
    const imageSet = images[object];

    trialKeys.forEach(key => {
      const correctImage = { key, image: imageSet[key] };
      const incorrectImages = this.getIncorrectImages(key, imageSet);
      const trialImages = this.shuffle([correctImage, ...incorrectImages]).map(
        (image, i) => ({ ...image, i })
      );
      const videoSet = videos[object][vocoded];
      const video = videoSet[`${key}_${vocoded}`];

      trial.push({
        correct: key,
        images: trialImages,
        video
      });
    });

    return trial;
  };

  saveTrial = referrer => {
    console.log(referrer);
    dialog.showSaveDialog(
      { filters: [{ name: 'CSV', extensions: ['csv'] }] },
      filename => {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
          path: filename,
          header: [
            { id: 'pid', title: 'Participant ID' },
            { id: 'date', title: 'Date and Time' },
            { id: 'presented', title: 'Objects Presented' },
            { id: 'correct', title: 'Target Object' },
            { id: 'selected', title: 'Objects Selected' }
          ]
        });
        const { trialData, pid } = this.state;
        const records = trialData.map(trial => ({
          pid,
          ...trial
        }));

        csvWriter
          .writeRecords(records)
          .then(() => this.setState({ errorMsg: 'File saved successfully' }))
          .catch(err =>
            this.setState({
              errorMsg: `Something went wrong, try again!:  ${err}`
            })
          );
      }
    );
    return this.saveButton();
  };

  saveButton = () => (
    <div>
      <div className={styles.backButton} data-tid="backButton">
        <Link to={routes.HOME}>
          <i className="fa fa-arrow-left fa-3x" />
        </Link>
      </div>
      <div>
        <span>{this.state.errorMsg}</span>
        <Fab
          style={{
            left: 'calc(50vw - 90px)',
            top: 'calc(50vh - 24px)',
            position: 'absolute'
          }}
          variant="extended"
          aria-label="Save"
          color="primary"
          onClick={() => this.saveTrial()}
        >
          Save the file again
        </Fab>
      </div>
    </div>
  );

  getIncorrectImages = (correctKey, imageSet) => {
    const otherImages = Object.keys(imageSet).filter(
      imageKey => imageKey !== correctKey
    );
    return this.shuffle(otherImages)
      .slice(0, 3)
      .map(key => ({
        key,
        image: imageSet[key]
      }));
  };

  shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // imgClass should be used to find selected image and attach green/red outline
  selectImage = (key, currentTrial, imgClass) => {
    const {
      guess,
      trialData,
      selected,
      trialNumber,
      lock,
      vocoded,
      trial
    } = this.state;
    const { correct } = currentTrial;

    if (lock) return;

    selected.push(key);

    // move to next trial and gather stats
    if (key === correct) {
      trialData.push({
        date: new Date(),
        presented: currentTrial.images.map(image => image.key),
        correct,
        selected
      });
      this.setState({
        guess: 0,
        trialNumber: trialNumber + 1,
        trialData,
        selected: []
      });
    }

    // inc guess, show try again vid, highlight incorrect image / remove it
    if (guess === 0 && key !== correct) {
      // TODD: highlight incorrect image, remove it
      console.log('wrong, guess = 0');
      const tempTrial = [...trial];
      tempTrial[trialNumber] = {
        ...tempTrial[trialNumber],
        video: videos['Try Again'][vocoded][`TryAgain_${vocoded}`]
      };

      this.setState(
        {
          guess: 1,
          selected,
          trial: tempTrial,
          showRedBorder: imgClass,
          lock: true
        },
        () =>
          setTimeout(() => {
            const tempImages = tempTrial[trialNumber].images.filter(
              image => image.key !== key
            );
            tempTrial[trialNumber] = {
              ...tempTrial[trialNumber],
              images: tempImages
            };
            this.setState({ showRedBorder: '', trial: tempTrial, lock: false });
          }, 3000)
      );
    }

    // inc guess, show here it is vid, highlight right answer
    if (guess === 1 && key !== correct) {
      // TODO: highlight correct image
      console.log('wrong, guess = 1');
      const tempTrial = [...trial];
      tempTrial[trialNumber] = {
        ...tempTrial[trialNumber],
        video: videos['Here It Is'][vocoded][`HereItIs_${vocoded}`]
      };

      const { i: correctKey } = tempTrial[trialNumber].images.find(
        ({ key: imgKey }) => imgKey === correct
      );

      this.setState(
        {
          guess: 2,
          selected,
          lock: true,
          trial: tempTrial,
          showGreenBorder: `image-${correctKey}`
        },
        () =>
          setTimeout(() => {
            trialData.push({
              date: new Date(),
              presented: currentTrial.images.map(image => image.key),
              correct,
              selected
            });
            this.setState({
              guess: 0,
              trialData,
              selected: [],
              lock: false,
              trialNumber: trialNumber + 1,
              showGreenBorder: ''
            });
          }, 4000)
      );
    }

    console.log(
      `guess: ${guess}, selected: ${selected}`,
      'trialData:',
      trialData
    );
  };

  render() {
    const {
      trial,
      trialNumber,
      errorMsg,
      showRedBorder,
      showGreenBorder
    } = this.state;
    if (errorMsg !== '') return this.saveButton();
    if (trialNumber >= 8) return this.saveTrial();
    const currentTrial = trial[trialNumber];
    console.log('something changed', currentTrial);
    return (
      <div>
        <div className={styles.backButton} data-tid="backButton">
          <Link to={routes.HOME}>
            <i className="fa fa-arrow-left fa-3x" />
          </Link>
        </div>
        <div
          className="video"
          style={{
            position: 'absolute',
            left: `calc(50vw - ${videoWidth / 2}px)`,
            top: `calc(50vh - ${videoHeight / 2}px)`
          }}
        >
          <Player
            height={videoHeight}
            width={videoWidth}
            fluid={false}
            autoPlay
            volume={0.5}
            key={currentTrial.video}
          >
            <source src={currentTrial.video} />
          </Player>
        </div>
        {currentTrial.images.map(({ image, key, i }) => {
          let style = {};
          const thisImage = `image-${i}`;
          if (showRedBorder === thisImage) style = { border: '10px solid red' };
          if (showGreenBorder === thisImage)
            style = { border: '10px solid green' };

          return (
            <Image
              src={image}
              rounded
              key={key}
              onClick={() => this.selectImage(key, currentTrial, `image-${i}`)}
              className={styles[`image-${i}`]}
              style={style}
            />
          );
        })}
      </div>
    );
  }
}

export default withRouter(Trial);
