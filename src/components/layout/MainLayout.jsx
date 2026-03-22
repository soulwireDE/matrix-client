import TitleBar from '../TitleBar'
import ServerSidebar from './ServerSidebar'
import ChannelSidebar from './ChannelSidebar'
import ChatArea from '../chat/ChatArea'
import MemberList from './MemberList'

export default function MainLayout() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw', overflow: 'hidden',
    }}>
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
        <ServerSidebar />
        <ChannelSidebar />
        <ChatArea />
        <MemberList />
      </div>
    </div>
  )
}