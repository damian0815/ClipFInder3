import './App.css';
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './Style/Collapsible.css'

import PopulateDatabase from "@/Components/PopulateDatabase.tsx";
import Collapsible from "react-collapsible";
import DistanceQuery from "@/Components/DistanceQuery.tsx";
import ZeroShotClassificationQuery from "@/Components/ZeroShotClassificationQuery.tsx";
import Image from "@/types/image";
import {useState} from "react";
import {TagEditorSidebar} from "@/Components/TagEditorSidebar.tsx";
import ProgressStatusBar from "@/Components/ProgressStatusBar.tsx";
import { ProgressWebSocketProvider } from "@/contexts/ProgressWebSocketContext";
import MainStatusBar from '@/Components/MainStatusBar';

function App() {

    const [selectedImages, setSelectedImages] = useState<Image[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <ProgressWebSocketProvider>
            <div className="App">
                <ProgressStatusBar />
                <div className={`main-content ${sidebarOpen ? 'with-sidebar' : ''}`}>
                    <h1>Image Search</h1>
                    <Collapsible trigger={"Populate"}>
                        <PopulateDatabase/>
                    </Collapsible>
                    <Collapsible trigger={"Tag filters"}>
                        <p>Tag filters go here</p>
                    </Collapsible>

                    <Tabs>
                      <TabList>
                          <Tab>Distance</Tab>
                          <Tab>Zero-Shot Classification</Tab>
                      </TabList>

                      <TabPanel>
                          <DistanceQuery setSelectedImages={setSelectedImages}/>
                      </TabPanel>
                      <TabPanel>
                          <ZeroShotClassificationQuery setSelectedImages={setSelectedImages}/>
                      </TabPanel>
                  </Tabs>
              </div>

              <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                  <div className="sidebar-toggle" onClick={toggleSidebar}>
                      {sidebarOpen ? '›' : '‹'}
                  </div>

                    <TagEditorSidebar
                        images={selectedImages}
                    />
              </div>

              <MainStatusBar selectedImages={selectedImages} />
            </div>
        </ProgressWebSocketProvider>
  );
}

export default App;
