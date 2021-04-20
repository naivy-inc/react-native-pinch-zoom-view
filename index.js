import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  StyleSheet,
  PanResponder,
  ViewPropTypes,
  Animated,
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
    maxWidth: PropTypes.number,
    maxHeight: PropTypes.number,
    onStart: PropTypes.func,
    onEnd: PropTypes.func,
    onZoom: PropTypes.func,
  }

  static defaultProps = {
    scalable: true,
    minScale: 0.5,
    maxScale: 1.5,
    maxHeight: 0,
    maxWidth: 0,
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
    }
    this.distant = 150
  }

  componentWillMount() {
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

  _handleStartShouldSetPanResponder = (e, gestureState) => {
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
    this.setState({
      lastX: this.state.offsetX,
      lastY: this.state.offsetY,
      lastScale: this.state.scale,
    })
    this.props.onZoom(this.state.scale)
    // this.props.onEnd()
  }

  @observable scale = 1
  @observable offsetX = new Animated.Value(0)
  @observable offsetY = new Animated.Value(0)

  _handlePanResponderMove = (e, gestureState) => {
    this.props.onZoom(this.state.scale)
    // zoom
    if (gestureState.numberActiveTouches === 2) {
      const dx = Math.abs(
        e.nativeEvent.touches[0].pageX - e.nativeEvent.touches[1].pageX,
      )
      const dy = Math.abs(
        e.nativeEvent.touches[0].pageY - e.nativeEvent.touches[1].pageY,
      )
      const distant = Math.sqrt(dx * dx + dy * dy)
      const scale = (distant / this.distant) * this.state.lastScale
      this.scale = scale
      // check scale min to max hello
      if (scale < this.props.maxScale && scale > this.props.minScale) {
        this.setState({ scale, lastMovePinch: true })
      }
    }
    // translate
    else if (gestureState.numberActiveTouches === 1) {
      if (this.state.lastMovePinch) {
        gestureState.dx = 0
        gestureState.dy = 0
      }
      const offsetX = this.state.lastX + gestureState.dx / this.state.scale
      const offsetY = this.state.lastY + gestureState.dy / this.state.scale
      // const temp = 1 / this.scale
      console.log(offsetX, ((this.scale - 1) * this.props.maxWidth) / 2)
      const X = ((this.scale - 1) * this.props.maxWidth) / 2
      const Y = ((this.scale - 1) * this.props.maxHeight) / 2

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
                { scaleX: this.state.scale },
                { scaleY: this.state.scale },
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
