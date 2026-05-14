

export function getRegole(data) {
  // Elenco regole configuratore (dim, color-variant, visible, ar, ...).
  return data.regole;
}

export function getAllRegMaterials(data){
  // Restituisce "specifica" della regola color-variant.

  for(const reg of data.regole){
    if(reg.tipologia === "color-variant"){
      return reg.specifica;
    }
  }

}


//da solo i nomi dei materiali
export function getAllMaterialByNameGroup(data, nameGroup) {
  // Lista nomi materiali disponibili per un gruppo.
  const mats = [];
    const specifica = getAllRegMaterials(data);
    for(const spe of specifica){
      if(spe.groupName === nameGroup){
        for(const mat of spe.material){
          mats.push(mat.name);
        }
      }
    }

    return mats;
}




export function getMeshsByNameGroup(data,nameGroup) {
  // Mesh names associati a un gruppo logico.
  const groups = data.groups;

  for (let i = 0; i < groups.length; i++) {
    if (groups[i].groupName === nameGroup) {
      return groups[i].meshs;
    }
  }
  return [];
}

export function getGroupNameByMesh(data, mesh) {
  // Risoluzione inversa: mesh name -> groupName.

  for (const group of data.groups) {
    if (group.meshs.includes(mesh)) {
      return group.groupName; 
    }
  }

  return null; 
}


export function getAllMeshsOfGroupByMesh(data,mesh) {
  // Dato un mesh name, restituisce tutte le mesh del suo gruppo.
  return getMeshsByNameGroup(data, getGroupNameByMesh(data,mesh));
  
}


export function getAllMesh(data) {
  // Collezione completa mesh raggruppate.
  const meshs= [];
  const groups = data.groups;
  for (const group of groups){
    meshs.push(group.meshs);
  }
  return meshs;
}

export function getAllGroupName(data){
  // Elenco completo gruppi presenti in color-variant specifica.
  const specifica = getAllRegMaterials(data);
  const nameGroups = []
  for(const spe of specifica){
    nameGroups.push(spe);
  }
  return nameGroups;
}

function getAllMaterial(data){
  const groups = getAllGroupName(data);
  const mats = []
  for(const grp of groups){
    mats.push(grp.material);
  }
  return mats;
}



export function getMaterialByName(data,material) {
  // Cerca e restituisce l'oggetto materiale per nome.
  const mats = getAllMaterial(data);
  for(const mat of mats){
    for( const m of mat){
        if(m.name === material ){
      return m
    }
    }
    
  }
  return null;


}
