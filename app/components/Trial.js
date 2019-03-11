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
const { remote } = require('electron');

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
          vocoded: { value: vocoded },
          transcription: { value: transcription }
        }
      }
    } = this.props;

    this.state = {
      pid,
      object,
      video,
      vocoded,
      transcription,
      trialNumber: 0,
      trial: this.generateTrial(object, vocoded),
      guess: 0,
      timeData: {
        first: null,
        second: null,
        start: new Date(),
        again: null,
        here: null
      },
      selected: [],
      trialData: [],
      lock: false,
      errorMsg: '',
      showRedBorder: '',
      showGreenBorder: '',
      showCorrectBorder: '',
      blackScreen: true
    };
  }

  componentDidMount() {
    setTimeout(
      () =>
        this.setState({ blackScreen: false }, () => this.refs.player.play()),
      1000
    );
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
    const { object, video, vocoded, transcription } = this.state;
    // console.log(referrer);
    dialog.showSaveDialog(
      { filters: [{ name: 'CSV', extensions: ['csv'] }] },
      filename => {
        const createCsvWriter = require('csv-writer').createObjectCsvWriter;
        const csvWriter = createCsvWriter({
          path: filename,
          header: [
            { id: 'pid', title: 'Participant ID' },
            {
              id: 'settings',
              title: 'Settings (object,video,vocoded,transcription)'
            },
            {
              id: 'presented',
              title:
                'Objects Presented (Top Left, Top Right, Bottom Left, Bottom Right)'
            },
            { id: 'correct', title: 'Target Object' },
            { id: 'selected', title: 'Objects Selected' },
            { id: 'start', title: 'Video/Audio Start' },
            { id: 'first', title: 'First Selection' },
            { id: 'again', title: 'Try Again Start' },
            { id: 'second', title: 'Second Selection' },
            { id: 'here', title: 'Here It Is Start' },
            { id: 'positions', title: 'Object positions (TL,TR,BL,BR)' },
            { id: 'pic', title: 'Picture Size [x,y]' }
          ]
        });
        const { trialData, pid } = this.state;
        const records = trialData.map(trial => ({
          pid,
          settings: `${object},${video},${vocoded},${transcription}`,
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
      trial,
      timeData
    } = this.state;
    const { correct } = currentTrial;

    if (lock) return;

    selected.push(key);

    const [w, h] = remote.getCurrentWindow().getSize();
    const positions = `[(${0.5 * w - 0.22 * h - 50 + 0.11 * h},${50 +
      0.22 * h +
      20 +
      0.11 * h}),
    (${w - (0.5 * w - 0.22 * h - 50 + 0.11 * h)},${50 +
      0.22 * h +
      20 +
      0.11 * h}),
    (${0.5 * w - 0.22 * h - 50 + 0.11 * h},${20 + 0.11 * h}),
    (${w - (0.5 * w - 0.22 * h - 50 + 0.11 * h)},${20 + 0.11 * h})]`;
    const pic = `[${0.22 * h},${0.22 * h}]`;

    // move to next and gather stats
    if (key === correct) {
      trialData.push({
        ...timeData,
        presented: currentTrial.permImages.map(image => image.key),
        correct,
        selected,
        positions,
        pic
      });
      this.setState(
        {
          guess: 0,
          trialData,
          selected: [],
          showCorrectBorder: imgClass
        },
        () =>
          setTimeout(() => {
            this.setState(
              { blackScreen: true, trialNumber: trialNumber + 1 },
              () =>
                setTimeout(() => {
                  this.setState(
                    {
                      timeData: {
                        first: null,
                        second: null,
                        start: new Date(),
                        again: null,
                        here: null
                      },
                      showCorrectBorder: '',
                      blackScreen: false
                    },
                    () => this.refs.player.play()
                  );
                }, 1500)
            );
          }, 3000)
      );
    }

    // inc guess, show try again vid, highlight incorrect image / remove it
    if (guess === 0 && key !== correct) {
      // console.log('wrong, guess = 0');
      const tempTrial = [...trial];
      tempTrial[trialNumber] = {
        ...tempTrial[trialNumber],
        video: videos['Try Again'][vocoded][`TryAgain_${vocoded}`]
      };
      timeData.first = new Date();
      // console.log('time.first', timeData);

      this.setState(
        {
          guess: 1,
          selected,
          trial: tempTrial,
          timeData,
          showRedBorder: imgClass,
          lock: true
        },
        () => {
          this.refs.player.play();
          setTimeout(() => {
            const tempImages = tempTrial[trialNumber].images.filter(
              image => image.key !== key
            );
            tempTrial[trialNumber] = {
              ...tempTrial[trialNumber],
              images: tempImages
            };

            timeData.again = new Date();
            // console.log('time.again', timeData);

            this.setState({
              showRedBorder: '',
              trial: tempTrial,
              timeData,
              lock: false
            });
          }, 3000);
        }
      );
    }

    // inc guess, show here it is vid, highlight right answer
    if (guess === 1 && key !== correct) {
      // TODO: highlight correct image
      // console.log('wrong, guess = 1');
      const tempTrial = [...trial];
      tempTrial[trialNumber] = {
        ...tempTrial[trialNumber],
        video: videos['Here It Is'][vocoded][`HereItIs_${vocoded}`]
      };

      timeData.second = new Date();
      // console.log('time.second', timeData);

      const { i: correctKey } = tempTrial[trialNumber].images.find(
        ({ key: imgKey }) => imgKey === correct
      );

      this.setState(
        {
          selected,
          lock: true,
          timeData,
          showGreenBorder: `image-${correctKey}`
        },
        () =>
          setTimeout(
            () => {
              timeData.here = new Date();
              // console.log('time.here', timeData);
              this.setState({ guess: 2, trial: tempTrial, timeData }, () => {
                this.refs.player.play();
                setTimeout(() => {
                  this.setState(
                    { blackScreen: true, trialNumber: trialNumber + 1 },
                    () =>
                      setTimeout(() => {
                        trialData.push({
                          ...timeData,
                          presented: currentTrial.permImages.map(
                            image => image.key
                          ),
                          correct,
                          selected,
                          positions,
                          pic
                        });
                        this.setState(
                          {
                            guess: 0,
                            trialData,
                            selected: [],
                            timeData: {
                              first: null,
                              second: null,
                              start: new Date(),
                              again: null,
                              here: null
                            },
                            lock: false,

                            showGreenBorder: '',
                            blackScreen: false
                          },
                          () => this.refs.player.play()
                        );
                      }, 1500) // black screen
                  );
                }, 5000); // here it is video
              });
            },
            2000 // delay after selecting image to when 'here it is' starts
          )
      );
    }

    /* console.log(
      `guess: ${guess}, selected: ${selected}`,
      'trialData:',
      trialData
    ); */
  };

  getTranscription = () => {
    const { transcription, trial, trialNumber } = this.state;
    if (transcription === 'off') return null;

    const currentTrial = trial[trialNumber];
    let text = `Where's the ${currentTrial.correct.toLowerCase()}?`;
    if (currentTrial.video.includes('Try Again')) text = 'Try again!';
    if (currentTrial.video.includes('Here It Is')) text = 'Here it is.';
    return text;
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
      video,
      transcription
    } = this.state;
    if (errorMsg !== '') return this.saveButton();
    if (trialNumber >= 8) return this.saveTrial();
    const currentTrial = trial[trialNumber];
    const subtitles = this.getTranscription();
    // console.log('something changed', currentTrial);
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
              volume={0.5}
              key={currentTrial.video}
              ref="player"
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
                  height: videoHeight - 50,
                  width: videoWidth
                }}
                src={imageOverlay}
              />
            </div>
          )}
        </div>
        <div
          className={
            transcription === 'on'
              ? styles['transcription-on']
              : styles['transcription-off']
          }
        >
          {subtitles}
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
