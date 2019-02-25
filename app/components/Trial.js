import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import { Player, ControlBar } from 'video-react';
import Image from 'react-bootstrap/Image';
import Fab from '@material-ui/core/Fab';
import routes from '../constants/routes';
import styles from './Trial.css';
import { videos } from '../videos';
import { images } from '../images';
import { keys } from '../keys';
import imageOverlay from '../assets/images/audioStill.jpeg';

const { dialog } = require('electron').remote;

const videoWidth = 600;
const videoHeight = 450;

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
      showGreenBorder: '',
      showCorrectBorder: '',
      blackScreen: false
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
        permImages: trialImages,
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
            {
              id: 'presented',
              title:
                'Objects Presented (Top Left, Top Right, Bottom Left, Bottom Right)'
            },
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
        <span style={{ color: 'white' }}>{this.state.errorMsg}</span>
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
        presented: currentTrial.permImages.map(image => image.key),
        correct,
        selected
      });
      this.setState(
        {
          guess: 0,
          trialData,
          selected: [],
          showCorrectBorder: imgClass
        },
        () =>
          setTimeout(
            () =>
              this.setState({ blackScreen: true }, () =>
                setTimeout(() => {
                  this.setState({
                    trialNumber: trialNumber + 1,
                    showCorrectBorder: '',
                    blackScreen: false
                  });
                }, 1500)
              ),
            3000
          )
      );
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

            this.setState({
              showRedBorder: '',
              trial: tempTrial,
              lock: false
            });
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
          selected,
          lock: true,
          showGreenBorder: `image-${correctKey}`
        },
        () =>
          setTimeout(
            () =>
              this.setState(
                { guess: 2, trial: tempTrial },
                () =>
                  setTimeout(() => {
                    this.setState(
                      { blackScreen: true },
                      () =>
                        setTimeout(() => {
                          trialData.push({
                            date: new Date(),
                            presented: currentTrial.permImages.map(
                              image => image.key
                            ),
                            correct,
                            selected
                          });
                          this.setState({
                            guess: 0,
                            trialData,
                            selected: [],
                            lock: false,
                            trialNumber: trialNumber + 1,
                            showGreenBorder: '',
                            blackScreen: false
                          });
                        }, 1500) // black screen
                    );
                  }, 5000) // here it is video
              ),
            2000 // delay after selecting image to when 'here it is' starts
          )
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
      showGreenBorder,
      showCorrectBorder,
      blackScreen,
      video
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
        {blackScreen && <div className={styles['black-screen']} />}
        <div
          className="container"
          style={{
            position: 'relative'
          }}
        >
          <div
            className="video"
            style={{
              position: 'absolute',
              left: `calc(50vw - ${videoWidth / 2}px)`,
              top: `0px`,
              pointerEvents: 'none'
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
              <ControlBar disableCompletely />
            </Player>
          </div>
          {video === 'audio' && (
            <div
              className="overlaidimage"
              style={{
                position: 'absolute',
                left: `calc(50vw - ${videoWidth / 2}px)`,
                top: `0px`
              }}
            >
              <Image
                style={{
                  height: videoHeight - 25,
                  width: videoWidth
                }}
                src={imageOverlay}
              />
            </div>
          )}
        </div>
        {currentTrial.images.map(({ image, key, i }) => {
          const thisImage = `image-${i}`;
          let classNames = `${styles[thisImage]} ${styles[`image-base`]}`;
          if (showRedBorder === thisImage)
            classNames += ` ${styles['red-border']}`;
          if (showGreenBorder === thisImage)
            classNames += ` ${styles['green-border']}`;
          if (showCorrectBorder === thisImage)
            classNames += ` ${styles['correct-border']}`;

          return (
            <Image
              src={image}
              rounded
              key={key}
              onClick={() => this.selectImage(key, currentTrial, thisImage)}
              className={classNames}
            />
          );
        })}
      </div>
    );
  }
}

export default withRouter(Trial);
