import React from "react";
import axios from "axios";

const CreateMembership = () => {
  const onClickCreateUserProduct = () => {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(new Date().getDate()+7);
    axios({
      url: "http://localhost:8080/memberships",
      method: "post",
      headers: { "Content-Type": "application/json" },
      data: {
        email:'exam7@gamil.com',
        expiredAt: sevenDaysLater,
        purchasedAt: new Date(),
      },
    });
  };
  return (
    <>
      <button onClick={onClickCreateUserProduct}>멤버쉽 생성하기</button>
    </>
  );
};
export default CreateMembership;