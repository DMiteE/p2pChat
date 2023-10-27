import { useCallback, useEffect, useState,useRef } from "react";
import freeice from "freeice";
import useStateWithCallback from "./useStateWithCallback";
import socket from "../socket";
import ACTIONS from "../socket/actions";


 export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export default function useWebRTC(roomID){
const [clients, setClients] = useStateWithCallback([])

    const addNewClient = useCallback((newClient, cb) =>{
        setClients(list => {
            if (!list.includes(newClient)) {
              return [...list, newClient]
            }
            return list;
          }, cb);
    },[clients,setClients])

    const peerConnections = useRef({})
    const localMediaStream = useRef()
    const peerMediaElements = useRef({
        [LOCAL_VIDEO]: null,
    })


    useEffect(()=>{
      async function startCapture(){
          localMediaStream.current = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                  width: 1280,
                  height: 720,
              }
          })


          addNewClient(LOCAL_VIDEO, ()=> {
              const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];

              if(localVideoElement){
                  localVideoElement.volume = 0;
                  localVideoElement.srcObject = localMediaStream.current;
              }
          });
      }

      startCapture()
       .then(() => socket.emit(ACTIONS.JOIN, {room: roomID}))
       .catch(e =>console.error('Ошибка медиа данных', e))
      return () => { 
        localMediaStream.current.getTracks().forEach(track => track.stop())
 
          socket.emit(ACTIONS.LEAVE)
      }
      

  },[roomID])


    useEffect(()=>{
        async function handleNewPeer({peerID, createOffer}){
            if (peerID in peerConnections.current){
                return console.warn(`Уже подключены ${peerID}`)
            }
            peerConnections.current[peerID] = RTCPeerConnection({
                iceServers: freeice(),
             });

            peerConnections.current[peerID].onicecandidate = event =>{
                if(event.candidate){
                    socket.emit(ACTIONS.RELAY_ICE, {
                        peerID,
                        iceCandidate: event.candidate,
                    })
                }
            }

            let tracksNumber = 0;

            peerConnections.current[peerID].ontrack = ({streams: [remoteStream]}) =>{
                tracksNumber++
                if(tracksNumber === 2){
                    addNewClient(peerID, ()=>{
                        peerMediaElements.current[peerID].srcObject = remoteStream;
                    })
                }

            }

            localMediaStream.current.getTracks().forEach(track =>{
                peerConnections.current[peerID].addTrack(track, localMediaStream.current)
            })
            if(createOffer){
                const offer = await peerConnections.current[peerID].createOffer();
                await peerConnections.current[peerID].setLocalDescription(offer);

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID,
                    sessionDescription: offer,
                })
            }
        }

        socket.on(ACTIONS.ADD_PEER, handleNewPeer)
    },[])

    useEffect(() => {
        async function setRemoteMedia({peerID, sessionDescription: remoteDescription}) {
          await peerConnections.current[peerID]?.setRemoteDescription(
            new RTCSessionDescription(remoteDescription)
          );
    
          if (remoteDescription.type === 'offer') {
            const answer = await peerConnections.current[peerID].createAnswer();
    
            await peerConnections.current[peerID].setLocalDescription(answer);
    
            socket.emit(ACTIONS.RELAY_SDP, {
              peerID,
              sessionDescription: answer,
            });
          }
        }
    
        socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia)
    
        return () => {
          socket.off(ACTIONS.SESSION_DESCRIPTION);
        }
      }, []);

    useEffect(() => {
        socket.on(ACTIONS.ICE_CANDIDATE, ({peerID, iceCandidate}) => {
          peerConnections.current[peerID]?.addIceCandidate(
            new RTCIceCandidate(iceCandidate)
          );
        });
    
        return () => {
          socket.off(ACTIONS.ICE_CANDIDATE);
        }
      }, []);
    
     useEffect(() => {
        const handleRemovePeer = ({peerID}) => {
          if (peerConnections.current[peerID]) {
            peerConnections.current[peerID].close();
          }
    
          delete peerConnections.current[peerID];
          delete peerMediaElements.current[peerID];
    
          setClients(list => list.filter(c => c !== peerID));
        };
    
        socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
    
        return () => {
          socket.off(ACTIONS.REMOVE_PEER);
        }
      }, []);
    
    const provideMediaRef = useCallback((id,node) => { 
        peerMediaElements.current[id] = node;
    }, [])

    return {clients,provideMediaRef};
}