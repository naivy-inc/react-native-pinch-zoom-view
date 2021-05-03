import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  PanResponder,
  ViewPropTypes,
  Animated,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native'
import { observable } from 'mobx'
import { sizeConverter } from '../../src/utils'

// Fallback when RN version is < 0.44
const viewPropTypes = ViewPropTypes || View.propTypes

export default class PinchZoomView extends Component {
  static propTypes = {
    ...viewPropTypes,
    scalable: PropTypes.bool,
    minScale: PropTypes.number,
    maxScale: PropTypes.number,
    enable: PropTypes.bool,
    onZoom: PropTypes.func,
    ImageUri: PropTypes.string,
  }

  static defaultProps = {
    scalable: true,
    minScale: 0.5,
    maxScale: 10,
    enable: false,
    ImageUri: '',
  }

  constructor(props) {
    super(props)
    this.state = {
      scale: 1,
      lastScale: 1,
      offsetX: 0,
      offsetY: 0,
      lastX: 0,
      lastY: 0,
      lastMovePinch: false,
      enable: false,
    }
    this.distant = 150
  }

  @observable imageHeight = 0
  @observable imageWidth = 0
  @observable scale = new Animated.Value(1)

  UNSAFE_componentWillMount() {
    this.gestureHandlers = PanResponder.create({
      onStartShouldSetPanResponder: this._handleStartShouldSetPanResponder,
      onMoveShouldSetPanResponder: this._handleMoveShouldSetPanResponder,
      onPanResponderGrant: this._handlePanResponderGrant,
      onPanResponderMove: this._handlePanResponderMove,
      onPanResponderRelease: this._handlePanResponderEnd,
      onPanResponderTerminationRequest: (evt) => true,
      onShouldBlockNativeResponder: (evt) => false,
    })
  }

  componentDidMount = () => {
    this._getImageSize()
  }

  _getImageSize = async () => {
    await Image.getSize(this.props.ImageUri, (width, height) => {
      this.imageWidth = sizeConverter(360)
      const temp = sizeConverter(360) / width
      this.imageHeight = height * temp
    })
  }

  _handleStartShouldSetPanResponder = (e, gestureState) => {
    this.props.onZoom(false)
    // don't respond to single touch to avoid shielding click on child components
    return false
  }

  _handleMoveShouldSetPanResponder = (e, gestureState) => {
    return (
      this.props.scalable
      && (Math.abs(gestureState.dx) > 2
        || Math.abs(gestureState.dy) > 2
        || gestureState.numberActiveTouches === 2)
    )
  }

  _handlePanResponderGrant = (e, gestureState) => {
    if (gestureState.numberActiveTouches === 2) {
      const dx = Math.abs(
        e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX,
      )
      const dy = Math.abs(
        e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY,
      )
      const distant = Math.sqrt(dx * dx + dy * dy)
      this.distant = distant
    }
  }

  _handlePanResponderEnd = (e, gestureState) => {
    if (this.state.scale < 1) {
      Animated.parallel([
        Animated.timing(this.offsetX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(this.offsetY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start((finished) => {
        if (finished) {
          this.state.offsetX = 0
          this.state.offsetY = 0
        }
      })
    }
    if (this.state.scale < 1) {
      Animated.timing(this.scale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start((finished) => {
        if (finished) {
          this.setState({
            scale: 1,
            lastMovePinch: true,
            lastX: this.state.offsetX,
            lastY: this.state.offsetY,
            lastScale: 1,
          })
          this.props.onZoom(true)
        }
      })
    }
    else if (this.state.scale > 3) {
      Animated.timing(this.scale, {
        toValue: 3,
        duration: 250,
        useNativeDriver: true,
      }).start((finished) => {
        if (finished) {
          this.setState({
            scale: 3,
            lastMovePinch: true,
            lastX: this.state.offsetX,
            lastY: this.state.offsetY,
            lastScale: 3,
          })
        }
      })
    }
    else {
      this.setState({
        scale: this.state.scale,
        lastMovePinch: true,
        lastX: this.state.offsetX,
        lastY: this.state.offsetY,
        lastScale: this.state.scale,
      })
      this.scale.setValue(this.state.scale)
    }
    this.scaleSet = false
  }

  @observable offsetX = new Animated.Value(0)
  @observable offsetY = new Animated.Value(0)
  @observable scaleSet = false

  _handlePanResponderMove = (e, gestureState) => {
    if (gestureState.numberActiveTouches === 2) {
      this.scaleSet = true
      const dx = Math.abs(
        e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX,
      )
      const dy = Math.abs(
        e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY,
      )
      const distant = Math.sqrt(dx * dx + dy * dy)
      const scale = (distant / this.distant) * this.state.lastScale
      // check scale min to max hello
      if (scale < this.props.maxScale && scale > this.props.minScale) {
        this.setState({ scale, lastMovePinch: true })
        this.scale.setValue(scale)
      }
    }

    // translate
    else if (gestureState.numberActiveTouches === 1 && !this.scaleSet) {
      if (!this.props.enable) return
      if (this.state.lastMovePinch) {
        gestureState.dx = 0
        gestureState.dy = 0
      }
      const offsetX = this.state.lastX + gestureState.dx / this.state.scale
      const offsetY = this.state.lastY + gestureState.dy / this.state.scale

      const temp =
        (sizeConverter(360) / this.state.scale - sizeConverter(360)) / 2

      const temp2 = (this.imageHeight / this.state.scale - this.imageHeight) / 2

      if (offsetX >= 0 && offsetX * -1 > temp) {
        this.offsetX.setValue(offsetX)
        this.setState({ offsetX, lastMovePinch: false })
      }
      else if (offsetX <= 0 && offsetX > temp) {
        this.offsetX.setValue(offsetX)
        this.setState({ offsetX, lastMovePinch: false })
      }
      else if (offsetX <= 0) {
        this.offsetX.setValue(temp)
        this.setState({ offsetX: temp, lastMovePinch: false })
      }
      else if (offsetX >= 0) {
        this.offsetX.setValue(-temp)
        this.setState({ offsetX: -temp, lastMovePinch: false })
      }

      if (offsetY >= 0 && offsetY * -1 > temp2) {
        this.offsetY.setValue(offsetY)
        this.setState({ offsetY, lastMovePinch: false })
      }
      else if (offsetY <= 0 && offsetY > temp2) {
        this.offsetY.setValue(offsetY)
        this.setState({ offsetY, lastMovePinch: false })
      }
      else if (offsetY <= 0) {
        this.offsetY.setValue(temp2)
        this.setState({ offsetY: temp2, lastMovePinch: false })
      }
      else if (offsetY >= 0) {
        this.offsetY.setValue(-temp2)
        this.setState({ offsetY: -temp2, lastMovePinch: false })
      }
      // this.offsetX.setValue(offsetX)
      // this.offsetY.setValue(offsetY)

      // if (
      //   (offsetX > 0 && offsetX - X > 0)
      //   || (offsetY > 0 && offsetY - Y > 0)
      // ) {
      //   console.warn(11111)
      // }
      // else if (
      //   (offsetX < 0 && offsetX + X < 0)
      //   || (offsetY < 0 && offsetY + Y < 0)
      // ) {
      //   console.warn(22222)
      // }
      // else if (this.scale >= 1) {
      // this.props.onStart()
      // this.setState({ offsetX, offsetY, lastMovePinch: false })
      // this.offsetX.setValue(offsetX)
      // this.offsetY.setValue(offsetY)
      // }
      // if (offsetX * (1 / this.scale) < 0 || offsetY * (1 / this.scale) < 0)
      // console.log(offsetX)
      // console.log(this.props.maxHeight, this.props.maxWidth)
    }
  }

  render() {
    return (
      <Animated.View
        {...this.gestureHandlers.panHandlers}
        style={
          [
            styles.container,
            this.props.style,
            {
              transform: [
                { scale: this.scale },
                // { translateX: this.state.offsetX },
                { translateX: this.offsetX },
                // { translateY: this.state.offsetY },
                { translateY: this.offsetY },
              ],
            },
          ]
        }
      >
        {this.props.children}
      </Animated.View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
