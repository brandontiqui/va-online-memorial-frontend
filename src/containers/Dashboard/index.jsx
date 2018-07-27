import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import dataAction from '../../actions/dataAction';
import actions from '../../actions/auth';
import uiActions from '../../actions/ui';
import MainHeaderComponent from '../../components/MainHeader';
import MainFooter from '../../components/MainFooter';
import ProfileCard from '../../components/ProfileCard';
import ProfileInfoTabs from '../../components/ProfileInfoTabs';
import RelatedProfiles from '../../components/RelatedProfiles';
import '../../containers/Search/search.scss';
import APIService from "../../services/api";
import CommonService from "../../services/common";
import * as moment from 'moment';
import * as _ from 'lodash';
import {DEFAULT_PROFILE_DATA} from '../../config';
import AuthService from "../../services/auth";
import {Redirect} from "react-router-dom";

const CONTENT_LIMIT = 4; // stories,photos,page limit

class Search extends Component {
  constructor(props) {
    super(props);
    this.$s = this.$s.bind(this);
    this.onAddEvent = this.onAddEvent.bind(this);
    this.onAddStory = this.onAddStory.bind(this);
    this.onAddTestimonial = this.onAddTestimonial.bind(this);
    this.onUploadPhoto = this.onUploadPhoto.bind(this);
    this.onAddBadge = this.onAddBadge.bind(this);
    this.onAddNOK = this.onAddNOK.bind(this);
    this.onAddFlag = this.onAddFlag.bind(this);
    this.updatePopupActive = this.updatePopupActive.bind(this);

    this.state = {
      isLoginActive: false,
      isRegisterActive: false,
      keyword: props.filters.name || '',
      veteran: {},
      isSearchFocused: false,
      relatedProfiles: [],
      profileCard: _.extend({}, DEFAULT_PROFILE_DATA),
      stories: {},
      photos: {},
      testimonials: {},
      badges: {},
      popupActive: ''
    };
    this.profileId = this.props[ 'routeParams' ][ 'id' ];
  }

  componentWillReceiveProps = (nextProps) => {
    if (this.props.routeParams[ 'id' ] !== nextProps.routeParams[ 'id' ]) {
      this.profileId = nextProps.routeParams[ 'id' ];
      this.onLoad();
    }
  };

  componentWillMount() {
    this.onLoad();
  }

  onLoad() {
    if (!AuthService.getCurrentUser()) return;
    this.props.dataAction.getData();
    /**
     * get veteran information
     */
    APIService.getVeteranById(this.profileId).then(v => {
      const profileCard = {
        life: `${moment(v[ 'birthDate' ]).format('ll')} - ${moment(v[ 'deathDate' ]).format('ll')}`,
        msgTitle: `Remembering ${this.getName(v)}`,
        profileName: this.getName(v),
        branch: this.getFirstElementName(v[ 'branches' ]),
        war: this.getFirstElementName(v[ 'wars' ]),
        burriedAt: this.getCemeteryName(v.cemetery),
        burrialLoc: this.getCemeteryAddress(v.cemetery),
        rank: this.getFirstElementName(v[ 'ranks' ]),
        campaign: this.getFirstElementName(v[ 'campaigns' ]),
      };
      this.setState({ profileCard: _.extend({}, this.state.profileCard, profileCard) });
    }).catch(err => CommonService.showError(err));

    /**
     * get event types
     */
    APIService.getEventTypes().then(eventTypes => {
      this.setState({ profileCard: _.extend({}, this.state.profileCard, { eventTypes: eventTypes.items }) });
    }).catch(err => CommonService.showError(err));

    /**
     * get timelineEvents
     */
    APIService.getVeteranEvents(this.profileId).then(events => {
      this.setState({ profileCard: _.extend({}, this.state.profileCard, { timelineEvents: events.items }) });
    }).catch(err => CommonService.showError(err));

    APIService.getbadgeTypes().then(badges => {
      this.setState({ profileCard: _.extend({}, this.state.profileCard, { badges: badges.items }) });
    }).catch(err => CommonService.showError(err));
    /**
     * get relate
     */
    APIService.getVeteranRelateById(this.profileId).then(relates => {
      const fakeImage = [ '/rp1.png', '/rp2.png', '/rp3.png' ]; // backend no profile image, so use fake image for now
      const relatedProfiles = [];
      if (relates.items && relates.items.length > 0) {
        relates.items.forEach((v, index) => {
          relatedProfiles.push({
            id: v.id, name: this.getName(v),
            imgSrc: fakeImage[ index % 3 ],
            life: `${new Date(v[ 'birthDate' ]).getFullYear()} - ${new Date(v[ 'deathDate' ]).getFullYear()}`
          });
        });
        this.setState({ relatedProfiles });
      }
    }).catch(err => CommonService.showError(err));

    this.fetchStories(0);
    this.fetchPhotos(0);
    this.fetchTestimonials(0);
    this.fetchBadges(0)
  }

  /**
   * add event to veteran
   * @param event the event entity
   * @param successCallback the success callback
   * @param failureCallback the failure callback
   */
  onAddEvent(event, successCallback, failureCallback) {
    APIService.createEvent(_.extend({}, event, { veteranId: this.profileId, status: "Requested" }))
      .then(rsp => {
        successCallback(rsp);
        CommonService.showSuccess("Event has been created, please wait for admin approval.");
      }).catch(err => {
        failureCallback(err);
        CommonService.showError(err)
      });
  }

  /**
   * add testimonial
   * @param entity the testimonial entity
   * @param successCallback the success callback
   * @param failureCallback the failure callback
   */
  onAddTestimonial(entity, successCallback, failureCallback) {
    APIService.createTestimonial(_.extend({}, entity, { veteranId: this.profileId, status: "Requested" }))
      .then(rsp => {
        successCallback(rsp);
        CommonService.showSuccess("Testimonial has been created, please wait for admin approval.");
      }).catch(err => {
        failureCallback(err);
        CommonService.showError(err);
      });
  }

  /**
   * upload photos
   * @param files the files
   * @param title the photo title
   * @param successCallback the success callback
   * @param failureCallback the failure callback
   */
  onUploadPhoto(files, title, successCallback, failureCallback) {
    APIService.uploadPhoto(files[ 0 ], title, this.profileId).then((rsp) => {
      successCallback(rsp);
      CommonService.showSuccess("Photo has been uploaded, please wait for admin approval.");
    }).catch(err => {
      failureCallback(err);
      CommonService.showError(err)
    });
  }

  /**
   * add badges
   * @param badgeIds the badge id
   * @param successCallback the success callback
   * @param failureCallback the failure callback
   */
  onAddBadge(badgeIds, successCallback, failureCallback) {
    const promises = badgeIds.map(id => APIService.createBadge({
      veteranId: this.profileId,
      status: "Requested",
      badgeTypeId: id
    }));

    Promise.all(promises).then((rsp) => {
      successCallback(rsp);
      CommonService.showSuccess(badgeIds.length + " Badges has been created, please wait for admin approval.");
    }).catch(err => {
      failureCallback(err);
      CommonService.showError(err)
    });
  }

  /**
   * add story
   * @param entity the story entity
   * @param successCallback the success callback
   * @param failureCallback the failure callback
   */
  onAddStory(entity, successCallback, failureCallback) {
    APIService.createStory(_.extend({}, entity, { veteranId: this.profileId, "status": "Requested" }))
      .then(rsp => {
        successCallback(rsp);
        CommonService.showSuccess("Story has been created, please wait for admin approval.");
      }).catch(err => {
        failureCallback(err);
        CommonService.showError(err)
      });
  }

  /**
   * on add Nok
   * @param files the nok proof files
   * @param fullName the full name
   * @param email the email address
   * @param cb the callback
   */
  onAddNOK(files, fullName, email, cb) {
    APIService.createNextOfKin(files, AuthService.getCurrentUser().id, this.profileId, fullName, email)
      .then(() => {
        cb();
        CommonService.showSuccess("NextOfKin has been created, please wait for admin approval.");
      }).catch(err => CommonService.showError(err));
  }

  /**
   * on add Flag
   * @param entity
   * @param cb
   */
  onAddFlag(entity, cb) {
    APIService.createFlag(entity)
      .then(() => {
        cb();
        CommonService.showSuccess(`Flag for ${entity.postType} has been created, please wait for admin approval.`);
      }).catch(err => CommonService.showError(err));
  }

  /**
   * get veteran name
   * @param v the Veteran entity
   */
  getName(v) {
    return `${v.firstName || ''} ${v.midName || ''} ${v.lastName || ''}`;
  }

  /**
   * get first element name
   */
  getFirstElementName(arr) {
    if (!arr || arr.length <= 0) return 'None';
    return arr[ 0 ][ 'name' ];
  }

  /**
   * get cemetery address
   * @param cemetery the cemetery entity
   */
  getCemeteryAddress(cemetery) {
    if (!cemetery) return 'None';
    const str = (v) => {
      if (!v) return '';
      return v;
    };
    return `${str(cemetery.state)} ${str(cemetery.city)} ${str(cemetery.addrOne)} ${str(cemetery.addrTwo)}`
  }

  /**
   * get cemetery name
   * @param cemetery the cemetery entity
   */
  getCemeteryName(cemetery) {
    if (!cemetery) return 'None';
    return cemetery.name;
  }

  // state update function
  $s(attr, delay) {
    return () => {
      if (!!delay) {
        window.setTimeout(() => {
          this.setState({ ...attr });
        }, delay)
      } else {
        this.setState({ ...attr });
      }
    }
  }

  /**
   * fetch stories
   * @param offset the offset
   */
  fetchStories(offset) {
    APIService.getStories({
      offset,
      limit: CONTENT_LIMIT,
      veteranId: this.profileId
    }).then(rsp => {
      const items = this.state.stories.items || [];
      rsp.items.forEach(i => items.push(i));
      this.setState({
        stories: {
          items, offset, limit: CONTENT_LIMIT, total: rsp.total
        }
      })
    }).catch(err => CommonService.showError(err));
  }

  /**
   * fetch story
   * @param index the index of the story in the stories array to fetch/reload
   */
  fetchStory(index) {
    const items = this.state.stories.items;
    const story = items[index];
    return APIService.getStory(story.id).then((fetched) => {
      items[index] = fetched;
      this.setState({
        stories: {
          items
        }
      });
    }).catch(err => CommonService.showError(err));
  }

  /**
   * fetch photos
   * @param offset the page offset
   */
  fetchPhotos(offset) {
    APIService.getPhotos({
      offset,
      limit: CONTENT_LIMIT,
      veteranId: this.profileId
    }).then(rsp => {
      const items = this.state.photos.items || [];
      rsp.items.forEach(i => items.push(i));
      this.setState({
        photos: {
          items, offset, limit: CONTENT_LIMIT, total: rsp.total
        }
      })
    }).catch(err => CommonService.showError(err));
  }

  /**
   * fetch photo
   * @param index the index of the photo in the photos array to fetch/reload
   */
  fetchPhoto(index) {
    const items = this.state.photos.items;
    const photo = items[index];
    return APIService.getPhoto(photo.id).then((fetched) => {
      items[index] = fetched;
      this.setState({
        photos: {
          items
        }
      });
    }).catch(err => CommonService.showError(err));
  }

  /**
   * fetch testimonials
   * @param offset the page offset
   */
  fetchTestimonials(offset) {
    APIService.getTestimonials({
      offset,
      limit: CONTENT_LIMIT,
      veteranId: this.profileId
    }).then(rsp => {
      const items = this.state.testimonials.items || [];
      rsp.items.forEach(i => items.push(i));
      this.setState({
        testimonials: {
          items, offset, limit: CONTENT_LIMIT, total: rsp.total
        }
      })
    }).catch(err => CommonService.showError(err));
  }

  /**
   * fetch photo
   * @param index the index of the testimonial in the testimonials array to fetch/reload
   */
  fetchTestimonial(index) {
    const items = this.state.testimonials.items;
    const testimonial = items[index];
    return APIService.getTestimonial(testimonial.id).then((fetched) => {
      items[index] = fetched;
      this.setState({
        testimonials: {
          items
        }
      });
    }).catch(err => CommonService.showError(err));
  }

  /**
   * fetch badge
   * @param offset the page offset
   */
  fetchBadges(offset) {
    APIService.getBadges({
      offset,
      limit: CONTENT_LIMIT,
      veteranId: this.profileId
    }).then(rsp => {
      const items = this.state.badges.items || [];
      rsp.items.forEach(i => items.push(i));
      this.setState({
        badges: {
          items, offset, limit: CONTENT_LIMIT, total: rsp.total
        }
      })
    }).catch(err => CommonService.showError(err));
  }

  /**
   * fetch badge
   * @param index the index of the badge in the badges array to fetch/reload
   */
  fetchBadge(index) {
    const items = this.state.badges.items;
    const badge = items[index];
    return APIService.getBadge(badge.id).then((fetched) => {
      items[index] = fetched;
      this.setState({
        badges: {
          items
        }
      });
    }).catch(err => CommonService.showError(err));
  }

  /**
   * update active popup
   * @param popupActive the active popup
   */
   updatePopupActive(popupActive) {
     this.setState({ popupActive });
   }

  render() {
    const { footerLinks, feedback, notifications } = { ...this.props.db };
    const { relatedProfiles, profileCard } = this.state;
    return (
      <div className="page-wrapper">
        {!AuthService.getCurrentUser() && <Redirect to={'/'}/>}
        <MainHeaderComponent attr={{ notifications }}/>

        <main className="main">
          {!!profileCard && (<ProfileCard attr={{ ...profileCard }}
                                          onAddStory={this.onAddStory}
                                          onAddTestimonial={this.onAddTestimonial}
                                          onUploadPhoto={this.onUploadPhoto}
                                          onAddBadge={this.onAddBadge}
                                          onAddNOK={this.onAddNOK}
                                          onAddFlag={this.onAddFlag}
                                          onAddEvent={this.onAddEvent}
                                          popupActive={this.state.popupActive}
                                          onPopupActive={this.updatePopupActive}/>)}
          {(<ProfileInfoTabs
            fetchStories={offset => this.fetchStories(offset)}
            fetchStory={index => this.fetchStory(index)}
            stories={this.state.stories}
            fetchPhotos={offset => this.fetchPhotos(offset)}
            fetchPhoto={index => this.fetchPhoto(index)}
            photos={this.state.photos}
            fetchTestimonials={offset => this.fetchTestimonials(offset)}
            fetchTestimonial={index => this.fetchTestimonial(index)}
            testimonials={this.state.testimonials}
            fetchBadges={offset => this.fetchBadges(offset)}
            fetchBadge={index => this.fetchBadge(index)}
            badges={this.state.badges}
            profileName={profileCard ? profileCard.profileName : null}
            onPopupActive={this.updatePopupActive}
          />)}

          {!!relatedProfiles && (<RelatedProfiles
            props={{ profiles: relatedProfiles }}/>)}
          <MainFooter props={{ ...footerLinks, ...feedback, ...{ addClass: 'sticky' } }}/>
        </main>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    ...state.dataReducer,
    ui: state.ui
  }
};

const matchDispatchToProps = (dispatch) => {
  return {
    actions: bindActionCreators({ ...actions }, dispatch),
    dataAction: bindActionCreators({ ...dataAction }, dispatch),
    ui: bindActionCreators({ ...uiActions }, dispatch)
  }
};

export default connect(mapStateToProps, matchDispatchToProps)(Search);
