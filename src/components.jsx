import React from 'react'
import { connect } from 'react-redux'

import { fetchAddresses, fetchEvents, fetchSelectedEventDetails } from './thunks'
import { eventGuid, canSelectEvents, undeletedAddresses } from './selectors'
import { actions } from './redux-store'


//--> User select form
const submitHandler = (dispatch, userId) => (e) => {
  e.preventDefault()

  dispatch({
    type: actions.CHANGE_SELECTED_USER_ID,
    payload: userId
  })
}

const changeHandler = (dispatch) => (e) => {
  const val = e.target.value

  dispatch({
    type: actions.CHANGE_SELECTED_USER_ID,
    payload: val
  })
  dispatch(fetchAddresses(val))
}

let UserSelectForm = ({ dispatch, userIds, selectedUserId }) => {
  return <form action="{API_BASE}/users/{selectedUserId}/addresses" method="GET" onSubmit={submitHandler(dispatch, selectedUserId)}>
    <select onChange={changeHandler(dispatch)} value={selectedUserId || ''}>
      <option>Select User ID</option>
      {userIds.map((id) => {
        return <option key={id} value={id}>{id}</option>
      })}
    </select>
  </form>
}
UserSelectForm = connect(state => state)(UserSelectForm)



//--> Events list
const handleEventToggle = (dispatch, guid) => (e) => {
  dispatch({
    type: actions.TOGGLE_EVENT_SELECTION,
    payload: guid
  })
}
let Event = ({ dispatch, event, guid, isSelected, isEnabled }) => {
  return <li>
    <input id={guid} type="checkbox" checked={isSelected} disabled={!isEnabled} onChange={handleEventToggle(dispatch, guid)} />
    <label htmlFor={guid}>
      {event.type} | {event.created_at}
    </label>
  </li>
}
Event = connect((state, ownProps) => {
  const isSelected = !!state.selectedEvents[ownProps.guid]
  return {
    isSelected : isSelected,
    isEnabled : isSelected || canSelectEvents(state.selectedEvents)
  }
})(Event)


const handleCompareClick = (dispatch) => (e) => {
  dispatch(fetchSelectedEventDetails())
  dispatch({
    type: actions.COMPARE_SELECTED_EVENTS,
    payload: true
    })
}

let EventList = ({dispatch, canCompare, events}) => {
  return <>
    <button onClick={handleCompareClick(dispatch)} disabled={!canCompare}>Compare</button>
    <ul>
      {events.map((event) => {
        return <Event event={event} key={eventGuid(event)} guid={eventGuid(event)} />
      })}
    </ul>
  </>
}
EventList = connect(state => { return { canCompare : Object.keys(state.selectedEvents).length > 1}})(EventList)


let Modal = ({dispatch, comparisonJson}) => {
    const [firstEvent, secondEvent] = comparisonJson
    const uniqueKeys = [ ...new Set([...Object.keys(firstEvent), ...Object.keys(secondEvent)])]

    const diffInput = uniqueKeys.reduce((diffInput, key) => {
      return {
        ...diffInput,
        [key]: {
          "event1": firstEvent[key],
          "event2": secondEvent[key],
          "eventDiff": key !== "id" ? firstEvent[key] !== secondEvent[key] : false
        }
      }
    }, {})
    
    return <>
      <div className="modal" role="dialog">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Event Comparison Viewer</h4>
            </div>
            <div className="modal-body">
              <table className="diff-table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Event 1</th>
                        <th>Event 2</th>
                    </tr>
                </thead>
                <tbody>
                  {
                    Object.keys(diffInput).map((key) => {
                      const {eventDiff, event1, event2} = diffInput[key]

                      return (
                        <tr key={key} className={`diff-row ${eventDiff ? "different": ''}`}>
                            <td className="cell key-cell">{key}</td>
                            <td className="cell">{event1}</td>
                            <td className="cell">{event2}</td>
                        </tr>
                      )
                    })
                  }
                </tbody>
            </table>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={handleCloseComparison(dispatch)}>Close</button>
          </div>
        </div>
      </div>
    </div>
    </>
}
Modal = connect(state => state)(Modal)

const handleCloseComparison = (dispatch) => (e) => {
  dispatch({
    type: actions.COMPARE_SELECTED_EVENTS,
    payload: false
  })
}

//--> Addresses list
const handleAddressClick = (dispatch, id) => (e) => {
  e.preventDefault()

  dispatch({
    type: actions.REQUEST_ADDRESS_DETAILS,
    payload: id
  })
  dispatch(fetchEvents(id))
}


let Address = ({ dispatch, addressJson, isSelected }) => {
  return <li onClick={handleAddressClick(dispatch, addressJson.id)} className={isSelected ? 'selected' : ''}>
    <pre>{JSON.stringify(addressJson, undefined, 2)}</pre>
  </li>
}
Address = connect((state, ownProps) => {
  return { isSelected : state.selectedAddressId === ownProps.addressJson.id }
})(Address)



//--> App wrapper
let App = ({ addresses, events, userIds, selectedUserId, selectedAddressId, comparingEvents, comparisonJson, error} ) => {
  return <>
    {error ? <p className="error">{error}</p> : ''}
    {userIds && userIds.length ?
      <UserSelectForm userIds={userIds} selectedUserId={selectedUserId} />
    : ''}
    <div className="addresses">
      <h2>Address Information</h2>
      {addresses && addresses.length
        ? <ul>
            {addresses.map((address) => {
              return <Address key={address.id} addressJson={address} />
            })}
          </ul>
        : <p>{selectedUserId ? 'No addresses found.' : 'Choose a user ID from the dropdown above.'}</p>
      }
    </div>
    <div className="events">
      <h2>Events</h2>
      { events && events.length
        ? <EventList events={events} />
        : <p>{selectedAddressId ? 'No events found.' : 'Select an address to see events'}</p>
      }
    </div>
      <div className="comparisonModal">
        { comparingEvents && comparisonJson?.length ?
          <Modal comparisonJson={comparisonJson}/> : ''
        }
      </div>
  </>
}
App = connect(state => {
  return {
    addresses : undeletedAddresses(state.addresses),
    ...state
  }
})(App)


export { App }
