import Reflux from 'reflux';
import _ from 'lodash';


import prefsStore from './prefs';
import {utilityStore, reRenderStore, tabs} from './main';

var screenshotStore = Reflux.createStore({
  init: function() {
    var save = (msg)=>{
      chrome.storage.local.set({screenshots: this.index}, (result)=> {
        console.log(msg);
      });
    };
    this.invoked = false;
    chrome.storage.local.get('screenshots', (shots)=>{
      if (shots && shots.screenshots) {
        this.index = shots.screenshots;
        this.purge(this.index);
      } else {
        this.index = [];
        save('default ss index saved');
      }
      console.log('ss index: ', this.index);
      this.trigger(this.index);
    });
  },
  capture(id, wid){
    var title = _.result(_.find(tabs(), { id: id }), 'title');
    var getScreenshot = new Promise((resolve, reject)=>{
      if (!this.invoked) {
        this.invoked = true;
        chrome.runtime.sendMessage({method: 'captureTabs'}, (response) => {
          console.log('response image: ',response);
          if (response) {
            if (response.image && title !== 'New Tab') {
              resolve(response.image);
            } else {
              reject();
            }
          }
        });
      }
    });
    if (title !== 'New Tab' && prefsStore.get_prefs().screenshot) {
      var ssUrl = _.result(_.find(tabs(), { id: id }), 'url');
      if (ssUrl) {
        getScreenshot.then((img, err)=>{
          var resize = new Promise((resolve, reject)=>{
            var sourceImage = new Image();
            sourceImage.onload = function() {
              var imgWidth = sourceImage.width / 2;
              var imgHeight = sourceImage.height / 2;
              var canvas = document.createElement("canvas");
              canvas.width = imgWidth;
              canvas.height = imgHeight;
              canvas.getContext("2d").drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
              var newDataUri = canvas.toDataURL('image/jpeg', 0.25);
              if (newDataUri) {
                resolve(newDataUri);
              }
            };
            sourceImage.src = img;
          });
          resize.then((image)=>{
            var screenshot = {url: null, data: null, timeStamp: Date.now()};
            screenshot.url = ssUrl;
            screenshot.data = image;
            console.log('screenshot: ', ssUrl, image);
            var urlInIndex = _.result(_.find(this.index, { url: ssUrl }), 'url');
            console.log('urlInIndex: ',urlInIndex);
            if (urlInIndex) {
              var dataInIndex = _.map(_.filter(this.index, { url: ssUrl }), 'data');
              var timeInIndex = _.map(_.filter(this.index, { url: ssUrl }), 'timeStamp');
              var index = _.findIndex(this.index, { 'url': ssUrl, 'data': _.last(dataInIndex), timeStamp: _.last(timeInIndex) });
              var newIndex = _.remove(this.index, this.index[index]);
              this.index = _.without(this.index, newIndex);
              console.log('newIndex',newIndex, this.index);
            }
            this.index.push(screenshot);
            this.index = _.uniqBy(this.index, 'url');
            this.index = _.uniqBy(this.index, 'data');
            chrome.storage.local.set({screenshots: this.index}, ()=>{
              this.invoked = false;
              this.trigger(this.index);
            });
          });
        }).catch(()=>{
          this.invoked = false;
          this.capture(id);
          _.defer(()=>utilityStore.restartNewTab());
        });
      }
    }
    
  },
  get_ssIndex(){
    return this.index;
  },
  set_ssIndex(value){
    this.index = value;
    chrome.storage.local.set({screenshots: this.index}, ()=>{
      this.trigger(this.index);
    });
  },
  get_invoked(){
    return this.invoked;
  },
  set_invoked(value){
    this.invoked = value;
  },
  clear(){
    chrome.storage.local.remove('screenshots', (result)=>{
      console.log('Screenshot cache cleared: ',result);
      _.defer(()=>{
        reRenderStore.set_reRender(true, 'create', tabs()[2].id);
      });
      this.index = [];
      this.trigger(this.index);
    });
  },
  purge(index, windowId){
    utilityStore.get_bytesInUse('screenshots').then((bytes)=>{
      var timeStamp = null;
      var timeStampIndex = null;
      console.log('bytes: ',bytes);
      // If screenshot cache is above 50MB, start purging screenshots that are 3 days old.
      if (bytes > 52428800) {
        var now = new Date(Date.now()).getTime();
        for (var i = index.length - 1; i >= 0; i--) {
          timeStampIndex = _.find(index, { timeStamp: index[i].timeStamp });
          timeStamp = new Date(timeStampIndex.timeStamp).getTime();
          if (timeStamp + 259200000 < now) {
            console.log('3 days old: ',index[i]);
            this.index = _.without(this.index, index[i]);
          }
          chrome.storage.local.set({screenshots: this.index});
          console.log('timeStamp: ',timeStamp);
        }
      }
    });
  }
});

export default screenshotStore;