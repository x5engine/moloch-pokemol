import React, { useContext } from 'react';
import ReactPlayer from 'react-player';
import { withApollo } from 'react-apollo';

import {
  getProposalCountdownText,
  titleMaker,
  descriptionMaker,
  linkMaker,
} from '../../utils/ProposalHelper';
import { CurrentUserContext } from '../../contexts/Store';
import { GET_METADATA } from '../../utils/Queries';
import Web3Service from '../../utils/Web3Service';
import VoteControl from './VoteControl';
import ValueDisplay from '../shared/ValueDisplay';

import './ProposalDetail.scss';

const ProposalDetail = ({
  proposal,
  processProposal,
  submitVote,
  canVote,
  client,
}) => {
  const web3Service = Web3Service.create();
  const [currentUser] = useContext(CurrentUserContext);
  const { periodDuration } = client.cache.readQuery({
    query: GET_METADATA,
  });

  const countDown = getProposalCountdownText(proposal, periodDuration);
  const title = titleMaker(proposal);
  const descriptionFromContract = descriptionMaker(proposal);
  const linkFromContract = linkMaker(proposal);

  return (
    <div className="ProposalDetail">
      <div className="Timer">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
        </svg>
        <p className="Data">{countDown}</p>
      </div>
      <h2>{title}</h2>
      <h5 className="Label">Applicant Address</h5>
      <p className="Data">{proposal.applicantAddress}</p>
      <div className="Offer">
        <div className="Shares">
          <h5>Shares</h5>
          <h2 className="Data">{proposal.sharesRequested}</h2>
        </div>
        <div className="Tribute">
          <h5>Tribute</h5>
          <h2 className="Data">
            {web3Service && (
              <ValueDisplay
                value={web3Service.fromWei(proposal.tokenTribute)}
              />
            )}
          </h2>
        </div>
      </div>
      <p>{proposal.description}</p>
      {proposal.status === 'ReadyForProcessing' && currentUser && (
        <button onClick={() => processProposal(proposal.id)}>Process</button>
      )}
      <div>
        {descriptionFromContract ? (
          <div>
            <h5>Description</h5>
            <p>{descriptionFromContract}</p>
          </div>
        ) : null}
        {linkFromContract && ReactPlayer.canPlay(linkFromContract) ? (
          <div className="Video">
            <ReactPlayer url={linkFromContract} playing={false} loop={false} />
          </div>
        ) : linkFromContract && linkFromContract.indexOf('http') > -1 ? (
          <div className="Link">
            <a
              href={linkFromContract}
              rel="noopener noreferrer"
              target="_blank"
            >
              Link
            </a>
          </div>
        ) : null}
      </div>
      <VoteControl
        submitVote={submitVote}
        proposal={proposal}
        canVote={canVote}
      />
    </div>
  );
};

export default withApollo(ProposalDetail);
