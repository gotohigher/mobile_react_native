import {
  useContractWrite,
  useContractRead,
  useWaitForTransaction,
  useAccount,
} from 'wagmi';
import {Alert} from 'react-native';
import {useEffect} from 'react';
import {
  CONTRACTADDRESS
} from '@env';

export default function SendTraction(props) {
  console.log('call send', props);
  const contractABI = require('./ContractABI.json');
  const contractAddress = CONTRACTADDRESS;
  const {address, connector} = useAccount();
  console.log(address, connector?.getProvider());
  // const {data, isError, isLoading} = useContractRead({
  //   address: contractAddress,
  //   abi: contractABI,
  //   functionName: 'getResult',
  // });
  // console.log('data', data, 'error', isError, 'loading', isLoading);

  // const {data: data1, writeAsync} = useContractWrite({
  //   address: contractAddress,
  //   abi: contractABI,
  //   functionName: 'matchHashes',
  //   account: address
  // });
  const {data: data1, write: write1} = useContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'storeHash1',
    args: [props.hash1]
  });

  const {data: data2, write: write2} = useContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'storeHash2',
    args: [props.hash2]
  });


  const {data: data3, write: write3} = useContractWrite({
    address: contractAddress,
    abi: contractABI,
    functionName: 'storeHash3',
    args: [props.hash3]
  });

  // write();
  useEffect(() => {
    if (write1 && write2 && write3) {
      console.log('write');
      write1();
      write2();
      write3();
    }
  }, [hash1, hash2, hash3]);

  // useEffect(() => {
  //   const writefunction = async () => {
  //     console.log('data');
  //     await writeAsync();
  //   };
  //   writefunction();
  // }, []);

  // // write.call();
  // write.apply();
  // const { isLoading, isSuccess } = useWaitForTransaction({
  //   hash: data?.hash,
  // })
  // console.log('data', data, 'error', isSuccess, 'loading', isLoading);
  // return <Button title={`${address}`} />;
}
