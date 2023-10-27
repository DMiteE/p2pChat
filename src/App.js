import { Route,Routes } from 'react-router';
import './App.css';
import Room from './pages/Room/Room'
import Main from './pages/Main'
import NotFound404 from './pages/NotFound404/index'

function App() {
  return (
    <div>
    <Routes>
      <Route path={"/room/:id"} element={<Room/>}/>
      <Route path={"/"} element={<Main/>}/>
      <Route element={<NotFound404/>} />
    </Routes>
    </div>
  );
}

export default App;
