import '@walletconnect/react-native-compat';
import {useEffect, useState} from 'react';
import {WagmiConfig} from 'wagmi';
import {mainnet, polygon, arbitrum, polygonMumbai} from 'viem/chains';
import {
  createWeb3Modal,
  defaultWagmiConfig,
  Web3Modal,
} from '@web3modal/wagmi-react-native';
import {W3mButton} from '@web3modal/wagmi-react-native';
import SendTraction from './SendTransaction';
import Main from './Main';
import {
  PROJECTID
} from '@env';

const projectId = PROJECTID;
const metadata = {
  name: 'Aliby',
  description: 'Connect metamask',
  url: 'https://web3modal.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
  redirect: {
    native: '',
    universal: '',
  },
};

const chains = [mainnet, polygon, arbitrum, polygonMumbai];

const wagmiConfig = defaultWagmiConfig({chains, projectId, metadata});

// 3. Create modal
createWeb3Modal({
  projectId,
  chains,
  wagmiConfig,
  // defaultChain: polygonMumbai,
});

export default function App() {
  const [hash1, setHash1] = useState('');
  const [hash2, setHash2] = useState('');
  const [hash3, setHash3] = useState('');

  return (
    <WagmiConfig config={wagmiConfig}>
      <Web3Modal />
      <Main setHash1={setHash1} setHash2={setHash2} setHash3={setHash3} />
      <W3mButton />
      <SendTraction hash1={hash1} hash2={hash2} hash3={hash3} />
    </WagmiConfig>
  );
}
