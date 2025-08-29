import '@/App.css';
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';
import '@/Style/Tabs.css';
import '@/Style/Collapsible.css'

import PopulateDatabase from "@/Components/PopulateDatabase.tsx";
import { Collapsible } from "@/Components/ui/Collapsible.tsx";
import DistanceQuery from "@/Components/DistanceQuery.tsx";
import ZeroShotClassificationQuery from "@/Components/ZeroShotClassificationQuery.tsx";
import Image from "@/types/image";
import {useState} from "react";
import {TagEditorSidebar} from "@/Components/TagEditorSidebar.tsx";
import ProgressStatusBar from "@/Components/ProgressStatusBar.tsx";
import { ProgressWebSocketProvider } from "@/contexts/ProgressWebSocketContext";
import MainStatusBar from '@/Components/MainStatusBar';
import { API_BASE_URL } from '@/Constants';
import { ResultCounts } from '@/types/searchResults';

function App() {

    const [selectedImages, setSelectedImages] = useState<Image[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [thumbnailSize, setThumbnailSize] = useState<number>(32);
    const [gridHasFocus, setGridHasFocus] = useState<boolean>(false);
    const [resultCounts, setResultCounts] = useState<ResultCounts>({fetched: 0, total: 0});

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handleRevealInFinder = (img: Image) => {
        console.log("reveal in finder for image", img);
        fetch(`${API_BASE_URL}/api/revealInFinder/${img.id}`);
    };


    return (
        <ProgressWebSocketProvider>
            <div className="App">
                <ProgressStatusBar />
                <div className={`main-content ${sidebarOpen ? 'with-sidebar' : ''}`}>
                    <h1>Image Search</h1>
                    
                    <div className="space-y-6">
                        <Collapsible trigger="Populate Database">
                            <PopulateDatabase/>
                        </Collapsible>
                        
                        <Collapsible trigger="Tag Filters">
                            <p className="text-slate-600">Tag filters go here</p>
                        </Collapsible>

                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                            <Tabs>
                              <TabList>
                                  <Tab>Distance</Tab>
                                  <Tab>Zero-Shot Classification</Tab>
                              </TabList>

                              <TabPanel>
                                  <DistanceQuery 
                                    setSelectedImages={setSelectedImages}
                                    onRevealInFinder={handleRevealInFinder}
                                    thumbnailSize={thumbnailSize}
                                    gridHasFocus={gridHasFocus}
                                    onGridFocusChange={setGridHasFocus}
                                    onResultCountsChange={setResultCounts}
                                  />
                              </TabPanel>
                              <TabPanel>
                                  <ZeroShotClassificationQuery 
                                    setSelectedImages={setSelectedImages}
                                    thumbnailSize={thumbnailSize}
                                    onGridFocusChange={setGridHasFocus}
                                  />
                              </TabPanel>
                          </Tabs>
                        </div>
                    </div>
              </div>

              <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                  <div className="sidebar-toggle" onClick={toggleSidebar}>
                      {sidebarOpen ? '›' : '‹'}
                  </div>

                    <TagEditorSidebar
                        images={selectedImages}
                    />
              </div>

              <MainStatusBar 
                selectedImages={selectedImages} 
                thumbnailSize={thumbnailSize}
                setThumbnailSize={setThumbnailSize}
                gridHasFocus={gridHasFocus}
                resultCounts={resultCounts}
              />
            </div>
        </ProgressWebSocketProvider>
  );
}

export default App;
