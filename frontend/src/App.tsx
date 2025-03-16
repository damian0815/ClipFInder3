import './App.css';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './Style/Collapsible.css'

import PopulateDatabase from "@/Components/PopulateDatabase.tsx";
import Collapsible from "react-collapsible";
import DistanceQuery from "@/Components/DistanceQuery.tsx";
import ZeroShotClassificationQuery from "@/Components/ZeroShotClassificationQuery.tsx";
import Image from "@/Components/Image.tsx";
import {useState} from "react";

function App() {

    const [selectedImages, setSelectedImages] = useState<Image[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

  return (
      <div className="App">
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
                      <ZeroShotClassificationQuery setSelectedImages={setSelectedImages}
                                                   />
                  </TabPanel>
              </Tabs>
          </div>

          <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
              <div className="sidebar-toggle" onClick={toggleSidebar}>
                  {sidebarOpen ? '›' : '‹'}
              </div>
              <div className="sidebar-content">
                  <h2>Selected Images</h2>
                  {selectedImages.map((image, index) => (image.id))}
                  {selectedImages.length === 0 ? (
                      <p>No images selected</p>
                  ) : (
                      <ul className="selected-images-list">
                          {selectedImages.map((image, index) => (
                              <li key={index}>
                                  {image.path}
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
          </div>


      </div>
  );
}

export default App; 