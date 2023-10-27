import socket from '../../socket'

import React, { useEffect, useRef, useState } from 'react'
import ACTIONS from '../../socket/actions';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';

const Main = () => {
  const history = useNavigate();
  const [rooms, setRooms] = useState([]);
  const rootNode = useRef();

  
  useEffect(()=>{
    socket.on(ACTIONS.SHARE_ROOMS, ({rooms=[]} = {})=>{
        if(rootNode.current){
          setRooms(rooms);
        }

    })
  },[])

  return (
    <div ref={rootNode}>
        <h1>Доступные команаты:</h1>
       
        <ul>
            {rooms.map(roomID=>(
                <li key={roomID}>
                    {roomID}
                    <button onClick={()=>{
            history(`/room/${roomID}`)
        }} >Войти</button>
                </li>
            ))}
        </ul>
        <button onClick={()=>{
            history(`/room/${v4()}`)
        }} >Создать комнату</button>
    </div>
  )
}

export default Main