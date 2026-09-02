import React, { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback 
} from 'react';

import {
  GripVertical,
  Loader2,
  AlertCircle,
  ArrowRight,
  Smartphone,
  MapPin,
  CheckCircle2,
  Layers,
  Package
} from 'lucide-react';

import { API_BASE } from '../hooks/useActiveBatch';


const DEVICES = [
  { id: 'HH-01', name: 'HH-01', status: 'active' },
  { id: 'HH-02', name: 'HH-02', status: 'active' },
  { id: 'HH-03', name: 'HH-03', status: 'inactive' },
  { id: 'HH-04', name: 'HH-04', status: 'active' },
];


const UNASSIGNED = '__unassigned__';


const AssignHandheld = ({
  currentBatchId,
  setUploadTab
}) => {


  const [
    finalData,
    setFinalData
  ] = useState(null);


  const [
    isLoading,
    setIsLoading
  ] = useState(true);


  const [
    notProcessed,
    setNotProcessed
  ] = useState(false);


  const [
    dragOverDeviceId,
    setDragOverDeviceId
  ] = useState(null);



  const loadFinalData = useCallback(async(batchId)=>{

    if(!batchId){
      setFinalData(null);
      setIsLoading(false);
      return;
    }


    setIsLoading(true);
    setNotProcessed(false);


    try{

      const res = await fetch(
        `${API_BASE}/api/handheld-assign/final-data?batchId=${batchId}`
      );


      if(res.status===404){

        setFinalData(null);
        setNotProcessed(true);
        return;

      }


      const result = await res.json();


      if(res.ok){

        setFinalData(
          result.data || []
        );

      }else{

        setFinalData(null);

      }


    }catch(err){

      console.error(err);
      setFinalData(null);

    }
    finally{

      setIsLoading(false);

    }


  },[]);



  useEffect(()=>{

    loadFinalData(currentBatchId);

  },[
    currentBatchId,
    loadFinalData
  ]);




  const addressGroups = useMemo(()=>{


    if(!finalData)
      return {};


    const groups={};


    finalData.forEach(row=>{


      const addr =
        row.ShortAddr || 'Unknown';


      const device =
        row.assignedHandheldId ||
        UNASSIGNED;



      if(!groups[device])
        groups[device]={};



      if(!groups[device][addr])
        groups[device][addr]=0;



      groups[device][addr]++;


    });


    return groups;


  },[
    finalData
  ]);




  const saveToServer = async(data)=>{

    try{

      await fetch(
        `${API_BASE}/api/handheld-assign/final-data`,
        {

          method:'POST',

          headers:{
            'Content-Type':'application/json'
          },

          body:JSON.stringify({

            batchId:currentBatchId,
            data

          })

        }
      );


    }catch(err){

      console.error(err);

    }

  };





  const handleDragStart = (
    e,
    shortAddr,
    sourceDeviceId
  )=>{


    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        shortAddr,
        sourceDeviceId
      })
    );

  };





  const handleDrop=(e,targetDeviceId)=>{


    e.preventDefault();

    setDragOverDeviceId(null);


    const raw =
      e.dataTransfer.getData(
        'application/json'
      );


    if(!raw)
      return;



    const {
      shortAddr,
      sourceDeviceId
    } =
    JSON.parse(raw);



    if(
      sourceDeviceId===targetDeviceId
    )
      return;



    setFinalData(prev=>{


      const next =
      prev.map(row=>{


        const current =
          row.assignedHandheldId ||
          UNASSIGNED;


        if(
          row.ShortAddr!==shortAddr ||
          current!==sourceDeviceId
        )
          return row;



        return {

          ...row,

          assignedHandheldId:
          targetDeviceId===UNASSIGNED
          ? undefined
          : targetDeviceId

        };


      });



      saveToServer(next);


      return next;


    });


  };




  if(isLoading){

    return (

      <div className="
        bg-white
        rounded-3xl
        p-20
        flex
        flex-col
        items-center
      ">

        <Loader2
          className="
          animate-spin
          text-accent
          mb-4
          "
          size={40}
        />

        Loading assignment...

      </div>

    );

  }




  if(notProcessed || !finalData){

    return (

      <div className="
        bg-white
        rounded-3xl
        border
        border-red-200
        p-20
        text-center
      ">


        <AlertCircle
          size={55}
          className="
          mx-auto
          text-red-400
          mb-4
          "
        />


        <h2 className="
          text-2xl
          font-bold
          mb-3
        ">

          Address Assignment Required

        </h2>


        <p className="text-gray-500 mb-6">

          Please assign Address/PIC before assigning handheld device.

        </p>


        <button

          onClick={()=>
            setUploadTab &&
            setUploadTab('Handheld')
          }

          className="
          bg-black
          text-white
          px-6
          py-3
          rounded-xl
          flex
          mx-auto
          gap-2
          "
        >

          Go Handheld

          <ArrowRight size={18}/>

        </button>


      </div>

    );

  }





  const activeDevices =
    DEVICES.filter(
      d=>d.status==='active'
    );



  const columns=[
    {
      id:UNASSIGNED,
      name:'Unassigned'
    },
    ...activeDevices
  ];




  const assigned =
    finalData.filter(
      x=>x.assignedHandheldId
    ).length;




return (

<div className="
space-y-6
pb-10
">


{/* HEADER */}

<div>

<h1 className="
text-3xl
font-bold
flex
items-center
gap-3
">

<Smartphone
className="text-accent"
/>

Assign Handheld


</h1>


<p className="
text-gray-500
mt-2
">

Drag address groups to handheld devices

</p>


</div>





{/* SUMMARY */}


<div className="
grid
grid-cols-1
md:grid-cols-3
gap-4
">


<div className="
bg-white
rounded-3xl
p-5
shadow-sm
">

<MapPin/>

<p className="text-gray-400 text-sm">
Addresses
</p>

<h2 className="text-3xl font-bold">
{finalData.length}
</h2>


</div>




<div className="
bg-white
rounded-3xl
p-5
">

<CheckCircle2/>

<p className="text-gray-400 text-sm">
Assigned
</p>

<h2 className="text-3xl font-bold">
{assigned}
</h2>

</div>





<div className="
bg-white
rounded-3xl
p-5
">

<Package/>

<p className="text-gray-400 text-sm">
Devices
</p>

<h2 className="text-3xl font-bold">
{activeDevices.length}
</h2>

</div>


</div>







<div className="
flex
gap-5
overflow-x-auto
pb-4
">


{
columns.map(col=>{


const addrMap =
addressGroups[col.id] || {};



const empty =
Object.keys(addrMap).length===0;



return (

<div

key={col.id}

onDragOver={e=>{
e.preventDefault();
setDragOverDeviceId(col.id);
}}

onDragLeave={()=>
setDragOverDeviceId(null)
}

onDrop={e=>
handleDrop(e,col.id)
}


className={`
min-w-[260px]
bg-white
rounded-3xl
p-5
border
transition-all

${
dragOverDeviceId===col.id
?
'border-accent scale-105'
:
'border-gray-100'
}

`}


>


<div className="
flex
justify-between
mb-5
">


<div>

<h3 className="
font-bold
text-xl
">

{col.name}

</h3>


<p className="text-xs text-gray-400">

{Object.keys(addrMap).length} zones

</p>


</div>


<Layers
className="text-accent"
/>


</div>





<div className="
space-y-3
min-h-[120px]
">


{
empty &&

<div className="
border-2
border-dashed
rounded-xl
p-8
text-center
text-gray-400
text-sm
">

Drop here

</div>

}



{
Object.entries(addrMap)
.map(([addr,count])=>(


<div

key={addr}

draggable

onDragStart={e=>
handleDragStart(
e,
addr,
col.id
)
}


className="
bg-gray-50
rounded-2xl
p-4
cursor-grab
hover:shadow-md
transition
"


>


<div className="
flex
justify-between
items-center
">


<span className="
font-bold
">

{addr}

</span>


<span className="
text-xs
bg-black
text-white
px-2
py-1
rounded-full
">

{count}

</span>


</div>


</div>


))


}



</div>


</div>


)


})


}


</div>


</div>


);


};


export default AssignHandheld;