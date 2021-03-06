import React, { useState, useEffect } from 'react';
import makeBlockie from 'ethereum-blockies-base64';
import { getProfile } from '3box/lib/api';

import Web3Service from '../../utils/Web3Service';
import ValueDisplay from '../shared/ValueDisplay';

import './MemberDetail.scss';

const MemberDetail = ({ member }) => {
  const [memberProfile, setMemberProfile] = useState({});
  const web3Service = Web3Service.create();

  useEffect(() => {
    const setup = async () => {
      let profile;
      try {
        profile = await getProfile(member.id);
      } catch {
        profile = {};
      }
      setMemberProfile(profile);
    };

    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="MemberDetail">
      <div className="MemberCard__identity">
        <div className="MemberCard__image">
          {memberProfile && memberProfile.image && memberProfile.image[0] ? (
            <div
              className="ProfileImgCard"
              style={{
                backgroundImage: `url(${'https://ipfs.infura.io/ipfs/' +
                  memberProfile.image[0].contentUrl['/']})`,
              }}
            >
              {''}
            </div>
          ) : (
            <div
              className="ProfileImgCard"
              style={{
                backgroundImage: `url("${makeBlockie(member.id)}")`,
              }}
            >
              {''}
            </div>
          )}
        </div>
        <div>
          <h2>{memberProfile.name}</h2>
          <p className="Data">{member.id}</p>
        </div>
      </div>
      <div className="Offer">
        <div className="Shares">
          <h5>Shares</h5>
          <h2 className="Data">{member.shares}</h2>
        </div>
        <div className="Tribute">
          <h5>Tribute</h5>
          <h2 className="Data">
            <ValueDisplay value={web3Service.fromWei(member.tokenTribute)} />
          </h2>
        </div>
      </div>
      <h5>Delegate Key</h5>
      <p className="Data">{member.delegateKey}</p>
    </div>
  );
};

export default MemberDetail;
