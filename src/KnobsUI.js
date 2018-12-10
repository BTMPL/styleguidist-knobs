/* eslint-disable react/no-multi-comp */
import React from 'react';
import PropTypes from 'prop-types';

import Styled from 'rsg-components/Styled'

const styles = ({space, fontFamily, fontSize, color, borderRadius, mq }) => ({
  ui: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.base,
    border: `1px solid ${color.border}`,
    padding: `${space[2]}px`,
    marginBottom: `${space[2]}px`,

    '& legend': {
      display: 'inline-block',
      padding: `0 ${space[1]}px`
    },

    '& input[type="text"], & input[type="number"], & select, & button, & button:hover, & button:focus': {
      fontSize: fontSize.base,
      fontFamily: fontFamily.base,
      padding: `${space[1]}px ${space[2]}px`,
      border: `1px solid ${color.border}`,
      flex: 1,
      maxWidth: '70vw'
    },

    '& button': {
      background: color.buttonDefault || '#e7e7e7',      
      width: 'auto',
      borderRadius,
      '&:hover, &:focus': {
        background: color.buttonHover || '#d3d3d3',
        cursor: 'pointer',
        borderRadius
      }
    },

    '& select': {
      '-webkit-appearance': 'menulist'
    }
  },

  control: {
    padding: `${space[0]}px 0`,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',

    [mq.small]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    }
  },

  controlLabel: {
    minWidth: '150px',
  },

  controlUi: {
    flex: 1,
    display: 'flex'
  },

  dynamicRowHost: {
    flex: 1
  },

  dynamicRow: {
    flex: 1,
    display: 'flex',
    paddingBottom: `${space[0]}px`,

    '& button, & button:focus, & button:hover': {
      flex: 'initial'
    }
  }
})

const Knobs = {};

const text = ({
  type = 'text',
  onChange,
  value,
  defaultValue,
  classes
}) => <input type={type} onChange={(e) => onChange(e.target.value)} value={value} defaultValue={defaultValue} />

const bool = ({
  onChange,
  value
}) => <input type={"checkbox"} checked={value} onChange={(e) => onChange(e.target.checked)} value={"on"} />

const oneOf = ({
  onChange,
  options,
  value
}) => (
  <select onChange={(e) => onChange(Object.keys(options)[e.target.selectedIndex - 1])} value={value}>
    <option>-- select --</option>
    {Object.entries(options).map(([key, value]) => (
      <option value={key} key={value}>{value}</option>
    ))}
  </select>
)

class array extends React.Component {
  state = {
    options: []
  };

  setValue = (index, value) => {
    this.setState(
      {
        options: this.state.options.map(i => {
          if (i.id === index) {
            return {
              ...i,
              value
            };
          }
          return i;
        })
      },
      this.handleChange
    );
  };

  handleRemove = index => {
    this.setState(
      {
        options: this.state.options.filter(i => i.id !== index)
      },
      this.handleChange
    );
  };

  handleAdd = () => {
    let id = 0;
    if (this.state.options.length > 0) {
      id = this.state.options[this.state.options.length - 1].id + 1;
    }
    this.setState({
      options: [...this.state.options, { id }]
    });
  };

  handleChange = () => {
    if (this.state.options.length === 0) {
      this.props.onChange(undefined);
    } else {
      this.props.onChange(this.state.options.map(i => i.value));
    }
  };

  render() {
    return (
      <div className={this.props.classes.dynamicRowHost}>
        {this.state.options.map(v => (
          <div key={v.id} className={this.props.classes.dynamicRow}>
            {React.createElement(Knobs.text, {
              value: v.value || '',
              onChange: this.setValue.bind(this, v.id)
            })}
            <button onClick={() => this.handleRemove(v.id)}>remove</button>
          </div>
        ))}
        <button onClick={this.handleAdd}>add option</button>
      </div>
    );
  }
}

Knobs.text = text;
Knobs.number = text;
Knobs.bool = bool;
Knobs.oneOf = oneOf;
Knobs.array = array;

class KnobsUI extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      knobs: {}
    }
  
    this.queuedUiElements = {};    
  }

  componentDidMount() {
    this.flushUiQueue();
  }

  componentDidUpdate() {
    this.flushUiQueue();
  }

  setCurrentKnobValue(name, value) {
    this.setState({
      knobs: {
        ...this.state.knobs,
        [name]: {
          ...this.state.knobs[name],
          value
        }
      }
    })
  }  

  getCurrentKnobValue(name) {
    return this.hasKnobForName(name) ? this.state.knobs[name].value : undefined;
  }  
  
  getAvailableKnobTypes({
    groupName = ''
  } = {}) {
    const knobRegistrar = ({
      type,
      name,
      value,
      ...rest
    }) => {
      if (!this.hasKnobForName(name)) {
        this.addUiElement({
          name, 
          type, 
          value,
          groupName,
          ...rest
        });
      }
      const currentValue = this.getCurrentKnobValue(name);
      return typeof currentValue === 'undefined' ? value : currentValue;   
    }

    return ({
      text: (name, value) => {     
        return knobRegistrar({
          name, 
          type: 'text', 
          value
        })
      },
      number: (name, value) => {     
        return knobRegistrar({
          name, 
          type: 'number', 
          value
        })
      },      
      bool: (name, value) => {
        return knobRegistrar({
          name, 
          value,
          type: 'bool'
        });
      },
      oneOf: (name, value, options) => {
        return knobRegistrar({
          name, 
          options,
          value,
          type: 'oneOf'
        });
      },
      array: (name, value) => {
        return knobRegistrar({
          name, 
          value,
          type: 'array'
        });
      },      
    })
  }

  getHelpers = () => {
    return ({
      group: groupName => {
        return this.getAvailableKnobTypes({
          groupName
        })
      }
    })
  }

  getRegisteredGroups = () => {
    return Object.keys(Object.values(this.state.knobs).reduce((accumulator, item) => {
      accumulator[item.groupName] = true;
      return accumulator;
    }, []));
  }

  getKnobsInGroup = (groupName) => {
    return Object.entries(this.state.knobs).filter(([,knob])=> knob.groupName === groupName).reduce((accumulator, [name, knob]) => {
      accumulator[name] = knob;
      return accumulator;
    }, {});
  }

  addUiElement({
    name,
    ...rest
  }) {
    this.queuedUiElements = ({
      ...this.queuedUiElements,
      [name]: {
        ...rest
      }
    }); 
  }  
  
  hasKnobForName = (name) => {
    return Object.prototype.hasOwnProperty.call(this.state.knobs, name);
  }

  flushUiQueue() {
    if (Object.values(this.queuedUiElements).length !== 0) {
      this.setState({
        knobs: {
          ...this.state.knobs,
          ...this.queuedUiElements
        }
      });
      this.queuedUiElements = {};
    }
  }    
    
  renderUi = () => {    
    return this.getRegisteredGroups().map(groupName => {
      return (
        <fieldset key={groupName} className={this.props.classes.ui}>
          {groupName && <legend>{groupName}</legend>}
          {Object.entries(this.getKnobsInGroup(groupName)).map(([name, element]) => {
            const props = {
              ...this.state.knobs[name],
              name,
              defaultValue: element.defaultValue,
              value: this.getCurrentKnobValue(name),
              onChange: (value) => this.setCurrentKnobValue(name, value)
            };
            return (
              <div key={name} className={this.props.classes.control}>
                <span className={this.props.classes.controlLabel}>{name}:</span>
                <div className={this.props.classes.controlUi}>
                  {React.createElement(Knobs[element.type], {
                    classes: this.props.classes,
                    ...props,
                  })}
                </div>
              </div>
            )
          })}
        </fieldset>
      )
    })
  }

  render() {
    return (
      <div>
        {this.renderUi()}
        {this.props.children({
          ...this.getAvailableKnobTypes(),
          ...this.getHelpers()
        })}
      </div>        
    );
  }
}

export default Styled(styles)(KnobsUI);