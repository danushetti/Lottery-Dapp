import Head from "next/head";
import styles from "../styles/Home.module.css";
import "bulma/css/bulma.css";
import { ethers } from "ethers";
import { useState, useEffect } from "react";
import LotteryContract from "../abi/Lottery.json";
import Web3Modal from 'web3modal';

export default function Home() {
  const [signer, setSigner] = useState();

  const [lotteryContract, setLotteryContract] = useState();
  const [currentManager, setCurrentManager] = useState();
  const [lotteryPot, setLotteryPot] = useState(0);
  const [lotteryParticipants, setLotteryParticipants] = useState([]);
  const [lotteryHistory, setLotteryHistory] = useState([]);
  const [error, setError] = useState();
  const [successMessage, setSuccessMessage] = useState();
  const [currentAddress, setCurrentAddress] = useState();

  // Updating the UI values every time the contract values are changed
  useEffect(() => {
    updateState();
  }, [lotteryContract]);

  const updateState = async (winningUpdate = false) => {
    if (lotteryContract) {
      const manager = await lotteryContract.manager();
      const pot = await lotteryContract.getCollectedAmount();
      const participants = await lotteryContract.getParticipants();
      const lotteryId = await lotteryContract.lotteryId();

      for (let i = lotteryId; i > 0; i--) {
        const winnerAddress = await lotteryContract.lotteryHistory(i);
        if (winnerAddress === "0x0000000000000000000000000000000000000000")
          continue;
        // Put winning message here: if i === lotteryId here then show the winning message with winner address
        if (i === lotteryId && winningUpdate) {
          setSuccessMessage(
            `${winnerAddress} won ${lotteryPot} Ether! Congratulations 🥳`
          );
        }
        const historyObj = { key: i, address: winnerAddress };
        // Adds the history object only if it doesn't already exist
        if (
          lotteryHistory.filter((e) => e.address === winnerAddress).length === 0
        ) {
          setLotteryHistory((lotteryHistory) => [
            ...lotteryHistory,
            historyObj,
          ]);
        }
      }

      setCurrentManager(manager);
      setLotteryPot(ethers.utils.formatEther(pot.toString()));
      setLotteryParticipants(participants);
    }
  };

  // Handler for connecting wallet
  const connectWalletHandler = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    
    const provider = new ethers.providers.Web3Provider(connection);
    if(provider){
    const getnetwork = await provider.getNetwork();
    const polygonChainId = 80001;
    
    if (getnetwork.chainId != polygonChainId) {
    alert("please switch to mumbai network");
    return;
    }

    //sign the transaction
        const signer  = await provider.getSigner();
        const contract = new ethers.Contract("0xe3B2B7a470cC4b33036Bbe5fd38afa9eEed2C92E",LotteryContract.abi, signer);
        const account = await signer.getAddress();
        // Setting the global constants
        setSigner(signer);
        setLotteryContract(contract);
        setCurrentAddress(account);
       
         } else {
      // MetaMask is not installed
      alert("Please install MetaMask extension first!");
    }
  };

  // Handler for participating in the lottery
  const participate = async () => {
    setError("");
    try {
      const tx = await signer.sendTransaction({
        to: "0xe3B2B7a470cC4b33036Bbe5fd38afa9eEed2C92E", // Lottery contract address
        value: ethers.utils.parseEther("0.01"),
      });
      await tx.wait();
      updateState();
    } catch (error) {
      if (error.message.search("Manager cannot participate") !== -1)
        setError("Manager cannot participate");
      else if (
        error.message.search(
          "Lottery is not yet started. Choose a manager first."
        ) !== -1
      )
        setError("Lottery is not yet started. Choose a manager first.");
      else setError(error.message);
    }
  };

  // Handler for getting results
  const getResults = async () => {
    setError("");
    try {
      setSuccessMessage("Sending transaction... Please wait");
      const tx = await lotteryContract.getResults();
      await tx.wait();

      let remainingSec = 120;
      const intervalId = window.setInterval(function () {
        setSuccessMessage(`Just ${--remainingSec}s more!`);
      }, 1000);
      setTimeout(() => {
        clearInterval(intervalId);
        updateState(true);
      }, 120_000);
    } catch (error) {
      setSuccessMessage("");
      if (error.message.search("Only manager can get the results") !== -1)
        setError("Only manager can get the results");
      else if (
        error.message.search("Lottery must have at least 3 participants") !== -1
      )
        setError("Lottery must have at least 3 participants");
      else if (
        error.message.search(
          "Lottery is not yet started. Choose a manager first."
        ) !== -1
      )
        setError("Lottery is not yet started. Choose a manager first.");
      else setError(error.message);
    }
  };
  // Handler for setting new manager
  const setNewManager = async () => {
    setError("");
    setSuccessMessage("");
    try {
      const tx = await lotteryContract.setNewManager();
      await tx.wait();
      updateState();
    } catch (error) {
      if (
        error.message.search("Cannot change manager in middle of a lottery") !==
        -1
      )
        setError("Cannot change manager in middle of a lottery");
      else setError(error.message);
    }
  };

  return (
    <div>
      <Head>
        <title>Ether Lottery</title>
        <meta name="description" content="An Ethereum Lottery dApp" />
        <link
          rel="icon"
          href={`${process.env.NEXT_PUBLIC_FAVICON}/favicon.ico`}
        />
      </Head>

      <main className={styles.main}>
        {/* Top nav */}
        <nav className="navbar mt-4 mb-4 relative py-2">
          <div className="container py-4 ">
            <div className="navbar-brand absolute top-1 px-4">
              <h1>Decentralized Lottery!!</h1>
             
            </div>
            <div className="navbar-end">
           
        <button className="button is-link" onClick={connectWalletHandler}>
        {currentAddress ? (
        <div>
          connected to {currentAddress.slice(0, 5)} ....{" "}
          {currentAddress.slice(currentAddress.length - 4)}
        </div>
      ) : ( <div>connect wallet   </div> )} </button>
           
            </div>
          </div>
        </nav>

        {/* Main */}
        <div className="container">
          <section className="mt-5">
            <div className="columns">
              {/* Left side */}
              <div className="column is-two-third">
                {/* Participation */}
                <section className="mt-5">
                  <p>
                    Participate in the lottery by sending exactly 0.01 Ether
                  </p>
                  <button
                    className="button is-link is-light is-large mt-3"
                    onClick={participate}
                  >
                    Participate
                  </button>
                  <p>
                    <strong>Your address:</strong> {currentAddress}
                  </p>
                </section>
                {/* Getting results */}
                <section className="mt-6">
                  <p>
                    <strong>Manager only:</strong> Get the lottery results
                  </p>
                  <button
                    className="button is-success is-light is-large mt-3"
                    onClick={getResults}
                  >
                    Get results
                  </button>
                  <p>
                    <strong>Current manager:</strong> {currentManager}
                  </p>
                </section>
                {/* Set new manager */}
                <section className="mt-6">
                  <p>
                    <strong>Only after a lottery round:</strong> Set new manager
                  </p>
                  <button
                    className="button is-warning is-light is-large mt-3"
                    onClick={setNewManager}
                  >
                    Set new manager
                  </button>
                </section>
                {/* Error preview */}
                <section>
                  <div className="container has-text-danger mt-6">
                    <p>{error}</p>
                  </div>
                </section>
                {/* Success preview */}
                <section>
                  <div className="container has-text-success mt-6">
                    <p>{successMessage}</p>
                  </div>
                </section>
              </div>

              {/* Right side */}
              <div className={`${styles.lotteryinfo} column is-one-third`}>
                {/* Lottery history */}
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Lottery History</h2>
                        {lotteryHistory.map((item) => {
                          return (
                            <div
                              className="history-entry mt-3"
                              key={`${item.key}-${item.address}`}
                            >
                              <div>Lottery #{item.key.toString()} winner:</div>
                              <div>
                                <a
                                  href={`https://rinkeby.etherscan.io/address/${item.address}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {item.address}
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
                {/* Participants */}
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Participants ({lotteryParticipants.length})</h2>
                        <div>
                          <ul className="ml-0">
                            {lotteryParticipants.map((participant, index) => {
                              return (
                                <li key={`${participant}-${index}`}>
                                  <a
                                    href={`https://rinkeby.etherscan.io/address/${participant}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {participant}
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                {/* Pot */}
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Pot</h2>
                        <p>{lotteryPot} Ether</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Bottom footer */}
      <footer className={styles.footer}>
        <p>
          &copy; 2023 <strong> Decentralized Lottery</strong> a project by Daneshwari
        </p>
      </footer>
    </div>
  );
}