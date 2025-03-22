import './App.css';
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './Style/Collapsible.css'

import PopulateDatabase from "@/Components/PopulateDatabase.tsx";
import Collapsible from "react-collapsible";
import DistanceQuery from "@/Components/DistanceQuery.tsx";
import ZeroShotClassificationQuery from "@/Components/ZeroShotClassificationQuery.tsx";
import Image from "@/Components/Image.tsx";
import {useState} from "react";
import {TagEditorSidebar} from "@/Components/TagEditorSidebar.tsx";

function App() {

    const [selectedImages, setSelectedImages] = useState<Image[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    function addTag(images: Image[], tagToAdd: string) {

    }

    function deleteTag(images: Image[], tagToDelete: string) {

    }

    function longestCommonPrefix(strs: string[]) {
      if (strs.length === 0) {
        return "";
      }
      let prefix = strs[0];
      for (let i = 1; i < strs.length; i++) {
        while (strs[i].indexOf(prefix) !== 0) {
          prefix = prefix.substring(0, prefix.length - 1);
          if (prefix === "") {
            return "";
          }
        }
      }
      return prefix;
    }

    function wrangleCommonPaths(images: Image[]) {
        const allPaths = images.map((i) => i.path);
        let commonRoot = longestCommonPrefix(allPaths);
        console.log('commonRoot is ', commonRoot, 'of allPaths', allPaths)
        const lastSlash = commonRoot.lastIndexOf("/");
        if (lastSlash == 0) {
            commonRoot = "/"
        } else if (lastSlash != -1) {
            commonRoot = commonRoot.substring(0, lastSlash);
        }
        return <div className={"common-paths"}>
            <div className={"filenames-list text-sm"}>{allPaths.map((p) => p.substring(commonRoot.length + 1)).join(", ")}</div>
            <div className={"text-xs"}>{allPaths.length} files selected in {commonRoot}</div>
        </div>
    }

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
                    requestDeleteTag={deleteTag}
                    requestAddTag={addTag}
                />
          </div>

            <div className={"status-bar"}>
                {selectedImages.length > 0 && wrangleCommonPaths(selectedImages)}
            </div>

      </div>
  );
}

export default App; 