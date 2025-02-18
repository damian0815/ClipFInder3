import './App.css';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './Style/Collapsible.css'

import PopulateDatabase from "@/Components/PopulateDatabase.tsx";
import Collapsible from "react-collapsible";
import DistanceQuery from "@/Components/DistanceQuery.tsx";
//import ZeroShotClassificationQuery from "@/Components/ZeroShotClassificationQuery.tsx";
import ZeroShotClassificationInput from "@/Components/ZeroShotClassificationInput.tsx";

function App() {

  return (
    <div className="App">
      <h1>Image Search</h1>
        <Collapsible trigger={"Populate"}>
            <PopulateDatabase />
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
                <DistanceQuery />
            </TabPanel>
            <TabPanel>
                {/*<ZeroShotClassificationQuery />*/}
                <ZeroShotClassificationInput />
            </TabPanel>
        </Tabs>



    </div>
  );
}

export default App; 